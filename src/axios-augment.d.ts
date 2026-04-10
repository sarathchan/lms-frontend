import 'axios'

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** When true, the global API error interceptor skips the toast. */
    silent?: boolean
  }
}
