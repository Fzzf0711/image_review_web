import axios, { type AxiosInstance, type AxiosResponse, type AxiosRequestConfig, type AxiosError } from 'axios'
import { ElMessage } from 'element-plus'

/**
 * API 响应类型
 */
export interface ApiResponse<T = any> {
  code: number
  msg?: string
  data?: T
}

/**
 * 创建 axios 实例
 */
const instance: AxiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 请求拦截器
 */
instance.interceptors.request.use(
  (config) => {
    return config
  },
  (error: AxiosError) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  },
)

/**
 * 响应拦截器
 */
instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data } = response

    // 统统一处理业务错误码
    if (data.code !== 200) {
      ElMessage.error(data.msg || '请求失败')
      return Promise.reject(new Error(data.msg || '请求失败'))
    }

    return data
  },
  (error: AxiosError) => {
    console.error('响应错误:', error)

    // 处理网络错误
    if (!window.navigator.onLine) {
      ElMessage.error('网络连接已断开，请检查网络设置')
      return Promise.reject(error)
    }

    // 处理 HTTP 错误
    const status = error.response?.status
    switch (status) {
      case 400:
        ElMessage.error('请求参数错误')
        break
      case 401:
        ElMessage.error('未授权，请重新登录')
        break
      case 403:
        ElMessage.error('拒绝访问')
        break
      case 404:
        ElMessage.error('请求的资源不存在')
        break
      case 500:
        ElMessage.error('服务器内部错误')
        break
      case 502:
      case 503:
        ElMessage.error('服务暂时不可用，请稍后重试')
        break
      default:
        ElMessage.error('网络请求失败，请检查网络连接')
    }

    return Promise.reject(error)
  },
)

/**
 * 封装请求方法
 */
export const http = {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return instance.get(url, config)
  },

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return instance.post(url, data, config)
  },

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return instance.put(url, data, config)
  },

  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return instance.delete(url, config)
  },

  // 上传文件（不自动 JSON 序列化）
  upload<T = any>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return instance.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}

export default instance
