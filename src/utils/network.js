
export const ERROR_TYPES = {
  NO_INTERNET: 'NO_INTERNET',
  API_ERROR: 'API_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  TIMEOUT: 'TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

export class GeminiRequestError extends Error {
  constructor({ code, message, httpStatus = null, model = null, retryable = false, cause = null }) {
    super(message || getErrorMessage(code));
    this.name = 'GeminiRequestError';
    this.code = code || ERROR_TYPES.UNKNOWN_ERROR;
    this.httpStatus = httpStatus;
    this.model = model;
    this.retryable = Boolean(retryable);
    this.userMessage = getErrorMessage(this.code);
    if (cause) this.cause = cause;
  }
}

const CONNECTIVITY_PROBES = [
  'https://clients3.google.com/generate_204',
  'https://www.gstatic.com/generate_204',
];

async function probeUrl(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    return typeof res?.status === 'number';
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkInternetConnectivity(timeoutMs = 2500) {
  for (const url of CONNECTIVITY_PROBES) {
    const ok = await probeUrl(url, timeoutMs);
    if (ok) return true;
  }
  return false;
}

export function classifyHttpError(status, apiMessage = '', model = null) {
  const msg = String(apiMessage || '').trim();
  const lower = msg.toLowerCase();

  if (
    status === 401 ||
    status === 403 ||
    /api[_\s-]*key|permission[_\s-]*denied|unauthenticated|invalid.*key|forbidden/.test(lower)
  ) {
    return new GeminiRequestError({
      code: ERROR_TYPES.AUTH_ERROR,
      httpStatus: status,
      model,
      retryable: false,
      message: msg || `Gemini Authentication Error (HTTP ${status})`,
    });
  }

  if (
    status === 429 ||
    /quota|rate[_\s-]*limit|resource[_\s-]*exhausted|too many requests/.test(lower)
  ) {
    return new GeminiRequestError({
      code: ERROR_TYPES.RATE_LIMIT,
      httpStatus: status,
      model,
      retryable: false, // retrying the identical quota-exhausted model immediately won't help; fallback to next model
      message: msg || `Gemini Rate Limit / Quota Exceeded (HTTP ${status})`,
    });
  }

  if (
    (status >= 500 && status <= 599) ||
    /unavailable|overloaded|high demand|internal error|bad gateway|service unavailable/.test(lower)
  ) {
    return new GeminiRequestError({
      code: ERROR_TYPES.SERVER_ERROR,
      httpStatus: status,
      model,
      retryable: true,
      message: msg || `Gemini Server Error (HTTP ${status})`,
    });
  }

  if (status >= 400 && status <= 499) {
    return new GeminiRequestError({
      code: ERROR_TYPES.API_ERROR,
      httpStatus: status,
      model,
      retryable: false,
      message: msg || `Gemini API Error (HTTP ${status})`,
    });
  }

  return new GeminiRequestError({
    code: ERROR_TYPES.UNKNOWN_ERROR,
    httpStatus: status,
    model,
    retryable: false,
    message: msg || `Unexpected HTTP status ${status}`,
  });
}

export function classifyException(err, { isOnline = null, model = null } = {}) {
  if (err instanceof GeminiRequestError) return err;

  const rawMsg = String(err?.message || err || '');
  const lower = rawMsg.toLowerCase();

  if (
    err?.name === 'AbortError' ||
    /abort|timeout|timed out|deadline/.test(lower)
  ) {
    return new GeminiRequestError({
      code: ERROR_TYPES.TIMEOUT,
      model,
      retryable: true,
      message: rawMsg || 'Request timed out',
      cause: err,
    });
  }

  if (err instanceof SyntaxError || /json|unexpected token|parse/.test(lower)) {
    return new GeminiRequestError({
      code: ERROR_TYPES.API_ERROR,
      model,
      retryable: false,
      message: rawMsg || 'Invalid API response format',
      cause: err,
    });
  }

  const looksLikeNetworkFailure =
    err?.name === 'TypeError' ||
    /network request failed|failed to fetch|networkerror|enotfound|econnrefused|econnreset|etimedout|err_internet_disconnected|err_name_not_resolved|offline|socket|ssl|tls|certificate/.test(
      lower
    );

  if (looksLikeNetworkFailure) {
    if (isOnline === false) {
      return new GeminiRequestError({
        code: ERROR_TYPES.NO_INTERNET,
        model,
        retryable: false,
        message: rawMsg || 'Device has no active internet connection',
        cause: err,
      });
    }
    if (isOnline === true) {
      return new GeminiRequestError({
        code: ERROR_TYPES.SERVER_ERROR,
        model,
        retryable: true,
        message: rawMsg || 'Device is online, but the external API server could not be reached',
        cause: err,
      });
    }
  }

  return new GeminiRequestError({
    code: ERROR_TYPES.UNKNOWN_ERROR,
    model,
    retryable: false,
    message: rawMsg || 'Unknown error',
    cause: err,
  });
}

export function getErrorMessage(errorCode, context = 'scan_description') {
  const isValidation = context === 'validation';
  const isAction = context === 'action';
  const isChatbot = context === 'chatbot';

  switch (errorCode) {
    case ERROR_TYPES.NO_INTERNET:
      if (isValidation) return 'No internet connection. Image validation is required before running a scan. Connect to Wi-Fi or mobile data and tap Retry Validation.';
      if (isAction) return 'No internet connection detected. Please check your Wi-Fi or mobile data and try again.';
      if (isChatbot) return 'No internet connection. Please connect to Wi-Fi or mobile data to chat with the Gemini Vet Assistant.';
      return 'No internet connection. Local scan results are shown below; connect to the internet to generate a full AI care description.';

    case ERROR_TYPES.RATE_LIMIT:
      if (isValidation) return 'Gemini image validation quota or rate limit was reached. Scanning was paused—please wait a moment and tap Retry Validation.';
      if (isAction) return 'The AI service has reached its request quota or rate limit. Please wait a moment and try again.';
      if (isChatbot) return 'API rate limit reached: Gemini has temporarily hit its request quota. Your device is online—please wait a moment and ask again.';
      return 'AI API rate limit reached while connected to the internet. Local scan findings are shown below; detailed Gemini narrative is temporarily unavailable due to quota limits.';

    case ERROR_TYPES.TIMEOUT:
      if (isValidation) return 'Gemini image validation timed out before confirming the photo. Scanning was paused—please check your connection and tap Retry Validation.';
      if (isAction) return 'The server did not respond within the allowed time (request timeout). Please try again.';
      if (isChatbot) return 'Request timeout: Your device is online, but the Gemini server did not respond in time. Please try sending your question again.';
      return 'Request timeout: Your device is online, but the Gemini server did not respond in time. Local scan findings are shown below.';

    case ERROR_TYPES.SERVER_ERROR:
      if (isValidation) return 'The image validation server is temporarily unavailable. Scanning was paused—please tap Retry Validation shortly.';
      if (isAction) return 'The external service returned a temporary server error. Please try again shortly.';
      if (isChatbot) return 'Server error: Your device has internet access, but Gemini is experiencing temporary high demand or server issues. Please try again shortly.';
      return 'Server error: Your device has internet access, but the Gemini server returned a temporary error. Local scan findings are shown below.';

    case ERROR_TYPES.AUTH_ERROR:
      if (isValidation) return 'Image validation service authentication failed. Please verify the Gemini API key configuration and retry.';
      if (isAction) return 'API authentication configuration is invalid. Please contact support or verify your API key.';
      if (isChatbot) return 'Authentication error: The Gemini API key or configuration is invalid. Please contact support or update your API credentials.';
      return 'Authentication error: Unable to authenticate with Gemini AI due to an invalid or missing API key configuration. Local scan findings remain available below.';

    case ERROR_TYPES.API_ERROR:
      if (isValidation) return 'The validation service could not verify this photo (invalid or incomplete response). Please tap Retry Validation or choose another photo.';
      if (isAction) return 'Gemini API could not process the request. Please try again with a different photo or prompt.';
      if (isChatbot) return 'Gemini API error: Your device is online, but Gemini could not process this message. Please rephrase and try again.';
      return 'Gemini API error: Your device is online, but Gemini could not process this request. Local scan findings are shown below.';

    case ERROR_TYPES.UNKNOWN_ERROR:
    default:
      if (isValidation) return 'Image validation failed unexpectedly before running the scan. Please tap Retry Validation.';
      if (isAction) return 'An unexpected error occurred while contacting the service. Please try again.';
      if (isChatbot) return 'Unknown error: Your device is online, but an unexpected error occurred while contacting Gemini AI. Please try again.';
      return 'Unknown error: Your device is online, but an unexpected error occurred while generating the AI description. Local scan findings are shown below.';
  }
}
