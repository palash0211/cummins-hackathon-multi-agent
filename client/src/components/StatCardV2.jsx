import React from 'react'

const StatCardV2 = ({ title, value, icon, variant }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'critical':
        return 'border-l-4 border-red-600 bg-white shadow-sm'
      case 'warning':
        return 'border-l-4 border-orange-500 bg-white shadow-sm'
      case 'success':
        return 'border-l-4 border-green-600 bg-white shadow-sm'
      default:
        return 'border-l-4 border-gray-600 bg-white shadow-sm'
    }
  }

  const getIconColor = () => {
    switch (variant) {
      case 'critical': return 'text-red-600'
      case 'warning': return 'text-orange-600'
      case 'success': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className={`p-6 rounded-lg transition-transform hover:-translate-y-1 duration-300 ${getVariantStyles()}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide mb-1">{title}</p>
          <h3 className="text-3xl font-extrabold text-gray-900">{value}</h3>
        </div>
        <div className={`p-3 rounded-full bg-gray-50 ${getIconColor()}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export default StatCardV2