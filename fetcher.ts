type FetcherConfig<T = unknown, R = unknown> = {
  baseUrl?: string
  contentType?: 'application/json' | 'application/x-www-form-urlencoded'
  headers?: HeadersInit
  params?: Record<string, string>
  timeout?: number
  transformRequest?: (
    data: NonNullable<T>,
    headers: HeadersInit
  ) => NonNullable<T>
  transformResponse?: (data: unknown) => R
  validateStatus?: (status: number) => boolean
  token?: string
}

type FetchMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

type FetcherResponse<T, R> = {
  data: R
  status: number
  statusText: string
  headers: Record<string, string>
  config: FetcherConfig<T, R>
  request: Response
}

class Fetcher {
  static defaults: FetcherConfig = {}

  static async request<T = unknown, R = unknown>(
    method: FetchMethod,
    url: string,
    data?: T,
    config: FetcherConfig<T, R> = {}
  ): Promise<FetcherResponse<T, R>> {
    if (typeof fetch === 'undefined') {
      throw new Error(
        'fetch is not defined. If you are running this on the backend, make sure to install a fetch-compatible library.'
      )
    }

    const baseUrl = config.baseUrl || Fetcher.defaults.baseUrl || ''
    let fetchUrl: URL | string

    if (/^(https?|ftp):\/\//.test(url)) {
      fetchUrl = new URL(url)
    } else if (baseUrl) {
      try {
        fetchUrl = new URL(url, baseUrl)
      } catch (e) {
        throw new Error(`Invalid URL: ${url}`)
      }
    } else {
      fetchUrl = url
    }

    if (config.params || Fetcher.defaults.params) {
      const urlParams = { ...Fetcher.defaults.params, ...config.params }
      if (typeof fetchUrl === 'string') {
        let queryString = ''
        Object.keys(urlParams).forEach((key) => {
          const value = urlParams[key]
          queryString += `${key}=${encodeURIComponent(value)}&`
        })
        fetchUrl = `${fetchUrl}?${queryString.slice(0, -1)}`
      } else {
        Object.keys(urlParams).forEach((key) =>
          (fetchUrl as URL).searchParams.append(key, urlParams[key])
        )
      }
    }

    const contentType =
      config.contentType || Fetcher.defaults.contentType || 'application/json'

    let headers: HeadersInit = {
      ...Fetcher.defaults.headers,
      ...config.headers,
      'Content-Type': contentType,
    }

    // Set the Authorization header if a token is provided
    if (config.token) {
      headers = { ...headers, Authorization: `Bearer ${config.token}` }
    }

    if (
      data &&
      (config.transformRequest || Fetcher.defaults.transformRequest)
    ) {
      const transformRequest =
        config.transformRequest || Fetcher.defaults.transformRequest
      data = transformRequest?.(data as NonNullable<T>, headers) as T
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    }

    if (data) {
      fetchOptions.body =
        contentType === 'application/x-www-form-urlencoded'
          ? new URLSearchParams(data).toString()
          : JSON.stringify(data)
    }

    const controller = new AbortController()
    fetchOptions.signal = controller.signal
    if (config.timeout || Fetcher.defaults.timeout) {
      const timeout = config.timeout || Fetcher.defaults.timeout
      setTimeout(() => controller.abort(), timeout)
    }

    const response = await fetch(fetchUrl.toString(), fetchOptions)

    const validateStatus =
      config.validateStatus ||
      Fetcher.defaults.validateStatus ||
      ((status: number) => status >= 200 && status < 300)

    if (!validateStatus(response.status)) {
      throw new Error(`Request failed with status code ${response.status}`)
    }

    let responseData = response.headers
      .get('content-type')
      ?.includes('application/json')
      ? await response.json()
      : await response.text()

    if (config.transformResponse || Fetcher.defaults.transformResponse) {
      const transformResponse =
        config.transformResponse || Fetcher.defaults.transformResponse
      responseData = transformResponse?.(responseData) as R
    }

    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      config,
      request: response,
    }
  }

  static get<R = unknown>(
    url: string,
    config?: FetcherConfig<never, R>
  ): Promise<FetcherResponse<never, R>> {
    return Fetcher.request<never, R>('GET', url, undefined, config)
  }

  static post<T = unknown, R = unknown>(
    url: string,
    data?: T,
    config?: FetcherConfig<T, R>
  ): Promise<FetcherResponse<T, R>> {
    return Fetcher.request<T, R>('POST', url, data, config)
  }

  static put<T = unknown, R = unknown>(
    url: string,
    data?: T,
    config?: FetcherConfig<T, R>
  ): Promise<FetcherResponse<T, R>> {
    return Fetcher.request<T, R>('PUT', url, data, config)
  }

  static delete<T = unknown, R = unknown>(
    url: string,
    config?: FetcherConfig<T, R>
  ): Promise<FetcherResponse<T, R>> {
    return Fetcher.request<T, R>('DELETE', url, undefined, config)
  }
}

export default Fetcher
