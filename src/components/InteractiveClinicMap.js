import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { DomWebView } from '@expo/dom-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Shadows } from '../theme/colors';

function buildMapHtml(initialDataJson) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    html, body, #map { width: 100%; height: 100%; background: #E8F0F8; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    .leaflet-control-attribution { display: none !important; }
    .user-dot-wrap {
      width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; position: relative;
    }
    .user-dot-pulse {
      position: absolute; width: 22px; height: 22px; border-radius: 50%;
      background: rgba(59, 130, 246, 0.28);
      animation: pulse 2s infinite;
    }
    .user-dot-core {
      width: 12px; height: 12px; border-radius: 50%;
      background: #2563EB; border: 2.5px solid #FFFFFF;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3); position: relative; z-index: 2;
    }
    @keyframes pulse {
      0% { transform: scale(0.8); opacity: 0.9; }
      70% { transform: scale(1.9); opacity: 0; }
      100% { transform: scale(0.8); opacity: 0; }
    }
    .clinic-pin {
      width: 30px; height: 30px; border-radius: 15px;
      display: flex; align-items: center; justify-content: center;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 3px 8px rgba(0,0,0,0.28);
      color: #FFFFFF; font-weight: 900; font-size: 16px; line-height: 1;
    }
    .clinic-pin.open { background: #22C55E; }
    .clinic-pin.closed { background: #EF4444; }
    .clinic-pin.selected {
      transform: scale(1.18);
      border-color: #FFF8F1;
      box-shadow: 0 4px 12px rgba(121, 75, 53, 0.55);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var INITIAL_DATA = ${initialDataJson};
    var map = null;
    var userMarker = null;
    var clinicMarkers = [];
    var routeOutline = null;
    var routeLine = null;
    var lastRouteSig = '';
    var hasInitializedBounds = false;
    var lastCenteredLat = null;
    var lastCenteredLng = null;
    var activeFetchToken = 0;

    function notifyRN(data) {
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
      } catch (e) {}
    }

    function drawRoadPolyline(latlngs, sig) {
      if (!map) return;
      if (routeOutline) { map.removeLayer(routeOutline); routeOutline = null; }
      if (routeLine) { map.removeLayer(routeLine); routeLine = null; }

      if (!latlngs || latlngs.length < 2) return;

      routeOutline = L.polyline(latlngs, {
        color: 'rgba(255, 255, 255, 0.95)',
        weight: 8,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      routeLine = L.polyline(latlngs, {
        color: '#794B35',
        weight: 5,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      if (sig !== lastRouteSig) {
        lastRouteSig = sig;
        map.fitBounds(routeLine.getBounds(), { padding: [32, 32], maxZoom: 16 });
      }
    }

    async function fetchRoadRouteInBrowser(origin, dest, token) {
      var urls = [
        'https://router.project-osrm.org/route/v1/driving/' + origin.longitude + ',' + origin.latitude + ';' + dest.longitude + ',' + dest.latitude + '?overview=full&geometries=geojson',
        'https://routing.openstreetmap.de/routed-car/route/v1/driving/' + origin.longitude + ',' + origin.latitude + ';' + dest.longitude + ',' + dest.latitude + '?overview=full&geometries=geojson'
      ];
      for (var i = 0; i < urls.length; i++) {
        try {
          var res = await fetch(urls[i]);
          var data = await res.json();
          if (token !== activeFetchToken) return;
          if (data && data.code === 'Ok' && data.routes && data.routes[0] && data.routes[0].geometry && data.routes[0].geometry.coordinates.length > 0) {
            var latlngs = data.routes[0].geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
            var sig = 'road:' + origin.latitude.toFixed(4) + ',' + dest.latitude.toFixed(4) + ':' + latlngs.length;
            drawRoadPolyline(latlngs, sig);
            return;
          }
        } catch (e) {}
      }
    }

    function initMap() {
      if (map || typeof L === 'undefined') return;
      var lat = (INITIAL_DATA.userCoords && INITIAL_DATA.userCoords.latitude) || 14.5995;
      var lng = (INITIAL_DATA.userCoords && INITIAL_DATA.userCoords.longitude) || 120.9842;

      map = L.map('map', {
        zoomControl: false,
        attributionControl: false
      }).setView([lat, lng], 13);

      var googleTiles = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      });

      var fallbackTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      });

      var switchedToFallback = false;
      googleTiles.on('tileerror', function() {
        if (!switchedToFallback) {
          switchedToFallback = true;
          fallbackTiles.addTo(map);
        }
      });

      googleTiles.addTo(map);
      window.updateMapData(INITIAL_DATA);
      notifyRN({ type: 'MAP_READY' });
    }

    window.recenterMap = function() {
      if (!map || !window.__latestPayload || !window.__latestPayload.userCoords) return;
      var u = window.__latestPayload.userCoords;
      map.flyTo([u.latitude, u.longitude], 14, { duration: 0.6 });
    };

    window.updateMapData = function(payload) {
      if (!payload) return;
      window.__latestPayload = payload;
      if (!map) {
        initMap();
        if (!map) return;
      }

      var u = payload.userCoords;
      if (u && typeof u.latitude === 'number' && typeof u.longitude === 'number') {
        var userIcon = L.divIcon({
          className: '',
          html: '<div class="user-dot-wrap"><div class="user-dot-pulse"></div><div class="user-dot-core"></div></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        if (!userMarker) {
          userMarker = L.marker([u.latitude, u.longitude], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
        } else {
          userMarker.setLatLng([u.latitude, u.longitude]);
        }
      }

      clinicMarkers.forEach(function(m) { map.removeLayer(m); });
      clinicMarkers = [];

      var clinics = Array.isArray(payload.clinics) ? payload.clinics : [];
      var selectedId = payload.selectedClinicId || null;

      clinics.forEach(function(c) {
        if (!c || !c.coordinates || typeof c.coordinates.latitude !== 'number' || typeof c.coordinates.longitude !== 'number') return;
        var isSelected = selectedId && c.id === selectedId;
        var pinClass = 'clinic-pin ' + (c.isOpen ? 'open' : 'closed') + (isSelected ? ' selected' : '');
        var icon = L.divIcon({
          className: '',
          html: '<div class="' + pinClass + '">+</div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        var marker = L.marker([c.coordinates.latitude, c.coordinates.longitude], { icon: icon }).addTo(map);
        marker.on('click', function() {
          notifyRN({ type: 'CLINIC_PRESS', id: c.id });
        });
        clinicMarkers.push(marker);
      });

      var route = Array.isArray(payload.routeCoords) ? payload.routeCoords : [];
      var dest = payload.selectedClinicCoords || null;

      if (!selectedId) {
        activeFetchToken++;
        if (routeOutline) { map.removeLayer(routeOutline); routeOutline = null; }
        if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
        if (lastRouteSig !== '' && u) {
          lastRouteSig = '';
          lastCenteredLat = u.latitude;
          lastCenteredLng = u.longitude;
          map.flyTo([u.latitude, u.longitude], 13, { duration: 0.5 });
        } else if (!hasInitializedBounds && u) {
          hasInitializedBounds = true;
          lastCenteredLat = u.latitude;
          lastCenteredLng = u.longitude;
          map.setView([u.latitude, u.longitude], 13);
        } else if (
          u &&
          (lastCenteredLat === null ||
            Math.abs(u.latitude - lastCenteredLat) > 0.001 ||
            Math.abs(u.longitude - lastCenteredLng) > 0.001)
        ) {
          lastCenteredLat = u.latitude;
          lastCenteredLng = u.longitude;
          map.flyTo([u.latitude, u.longitude], 14, { duration: 0.6 });
        }
        return;
      }

      if (route.length > 2) {
        activeFetchToken++;
        var latlngs = route.map(function(pt) { return [pt.latitude, pt.longitude]; });
        var sig = 'rn-road:' + selectedId + ':' + route.length;
        drawRoadPolyline(latlngs, sig);
      } else if (u && dest && typeof dest.latitude === 'number' && typeof dest.longitude === 'number') {
        activeFetchToken++;
        fetchRoadRouteInBrowser(u, dest, activeFetchToken);
      }
    };

    document.addEventListener('DOMContentLoaded', initMap);
    setTimeout(initMap, 100);
  </script>
</body>
</html>`;
}

export default function InteractiveClinicMap({
  userCoords,
  clinics,
  routeCoords,
  selectedClinic,
  onPressClinic,
  onRefreshLocation,
}) {
  const webViewRef = useRef(null);
  const [mapUri, setMapUri] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  const payload = useMemo(
    () => ({
      userCoords: userCoords
        ? { latitude: Number(userCoords.latitude), longitude: Number(userCoords.longitude) }
        : null,
      clinics: (clinics || []).map((c) => ({
        id: c.id,
        name: c.name,
        isOpen: !!c.isOpen,
        coordinates: c.coordinates
          ? {
              latitude: Number(c.coordinates.latitude),
              longitude: Number(c.coordinates.longitude),
            }
          : null,
      })),
      routeCoords: (routeCoords || []).map((pt) => ({
        latitude: Number(pt.latitude),
        longitude: Number(pt.longitude),
      })),
      selectedClinicId: selectedClinic?.id || null,
      selectedClinicCoords: selectedClinic?.coordinates
        ? {
            latitude: Number(selectedClinic.coordinates.latitude),
            longitude: Number(selectedClinic.coordinates.longitude),
          }
        : null,
    }),
    [userCoords, clinics, routeCoords, selectedClinic]
  );

  useEffect(() => {
    let active = true;
    async function prepareHtmlFile() {
      const html = buildMapHtml(JSON.stringify(payload));
      try {
        if (FileSystem.cacheDirectory) {
          const fileUri = `${FileSystem.cacheDirectory}pawscura_clinic_map_v3.html`;
          await FileSystem.writeAsStringAsync(fileUri, html, {
            encoding: FileSystem.EncodingType?.UTF8 || 'utf8',
          });
          if (active) setMapUri(fileUri);
          return;
        }
      } catch (err) {
        console.warn('Map cache file fallback to data URI:', err.message);
      }
      if (active) {
        setMapUri(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      }
    }

    if (userCoords && !mapUri) {
      prepareHtmlFile();
    }
    return () => {
      active = false;
    };
  }, [userCoords, mapUri, payload]);

  const pushPayloadToWebView = useCallback(
    (data) => {
      if (!webViewRef.current) return;
      const script = `window.updateMapData && window.updateMapData(${JSON.stringify(data)}); true;`;
      webViewRef.current.injectJavaScript(script);
    },
    []
  );

  useEffect(() => {
    if (!mapUri || !mapReady) return;
    pushPayloadToWebView(payload);
  }, [payload, mapUri, mapReady, pushPayloadToWebView]);

  const handleMessage = (event) => {
    try {
      const raw = event?.nativeEvent?.data;
      if (!raw) return;
      const msg = JSON.parse(raw);
      if (msg.type === 'MAP_READY') {
        setMapReady(true);
        pushPayloadToWebView(payload);
        return;
      }
      if (msg.type === 'CLINIC_PRESS' && msg.id && onPressClinic) {
        const found = (clinics || []).find((c) => c.id === msg.id);
        if (found) onPressClinic(found);
      }
    } catch (_) {}
  };

  const handleRecenter = () => {
    webViewRef.current?.injectJavaScript('window.recenterMap && window.recenterMap(); true;');
    if (typeof onRefreshLocation === 'function') {
      onRefreshLocation();
    }
  };

  if (!userCoords || !mapUri) {
    return (
      <View style={styles.loadingBg}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <DomWebView
        ref={webViewRef}
        source={{ uri: mapUri }}
        style={styles.webview}
        containerStyle={styles.webviewContainer}
        nestedScrollEnabled={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onMessage={handleMessage}
      />
      <TouchableOpacity
        style={styles.recenterBtn}
        onPress={handleRecenter}
        activeOpacity={0.8}
      >
        <Ionicons name="locate" size={18} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#E8F0F8',
  },
  webviewContainer: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingBg: {
    flex: 1,
    backgroundColor: '#E8F0F8',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 248, 241, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
});
