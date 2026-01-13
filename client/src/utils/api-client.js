import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// GET request
export const get = async (endpoint, config = {}) => {
  try {
    const response = await apiClient.get(endpoint, config)
    return response.data
  } catch (error) {
    console.error(`GET ${endpoint} failed:`, error)
    throw error
  }
}

// POST request
export const post = async (endpoint, data = {}, config = {}) => {
  try {
    const response = await apiClient.post(endpoint, data, config)
    return response.data
  } catch (error) {
    console.error(`POST ${endpoint} failed:`, error)
    throw error
  }
}

// PATCH request
export const patch = async (endpoint, data = {}, config = {}) => {
  try {
    const response = await apiClient.patch(endpoint, data, config)
    return response.data
  } catch (error) {
    console.error(`PATCH ${endpoint} failed:`, error)
    throw error
  }
}

// DELETE request
export const deleteRequest = async (endpoint, config = {}) => {
  try {
    const response = await apiClient.delete(endpoint, config)
    return response.data
  } catch (error) {
    console.error(`DELETE ${endpoint} failed:`, error)
    throw error
  }
}

export default apiClient
