import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE_KEY = 'rawResponse';

/**
 * Marks a route handler's return value as already in final form
 * (e.g. a file stream or redirect) so the global ResponseInterceptor
 * skips wrapping it in the { success, data } envelope.
 */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);
