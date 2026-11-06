// components/admin/ProductForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shoe } from '@/lib/sanity'

interface ProductFormProps {
  initialData?: Shoe
}

const CATEGORIES = [
  { value: 'sneakers', label: 'Sneakers' },
  { value: 'boots', label: 'Boots' },
  { value: 'sandals', label: 'Sandals' },
  { value: 'loafers', label: 'Loafers' },
  { value: 'sports-shoes', label: 'Sports Shoes' },
  { value: 'formal-shoes', label: 'Formal Shoes' },
]

const SIZES = [6, 7, 8, 9, 10, 11, 12]

export default function ProductForm({ initialData }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    orderNumber: initialData?.orderNumber || 0,
    productName: initialData?.productName || '',
    shoeBrand: initialData?.shoeBrand || '',
    category: initialData?.category || 'sneakers',
    sizes: initialData?.sizes || [8, 9, 10],
    colorVariants: initialData?.colorVariants || [],
    tags: initialData?.tags || [],
    description: initialData?.description || '',
    madeIn: initialData?.madeIn || '',
    price: initialData?.price || 0,
    isOffer: initialData?.isOffer || false,
    offerPrice: initialData?.offerPrice || 0,
    buyOneGetOne: initialData?.buyOneGetOne || false,
    stock: initialData?.stock || 0,
    isDisabled: initialData?.isDisabled || false,
    disableReason: initialData?.disableReason || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const endpoint = initialData 
        ? `/api/products/${initialData._id}`
        : '/api/products'
      
      const method = initialData ? 'PUT' : 'POST'
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        router.push('/admin/products')
        router.refresh()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save product')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Order Number *
          </label>
          <input
            type="number"
            value={formData.orderNumber}
            onChange={(e) => setFormData({...formData, orderNumber: Number(e.target.value)})}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
          <p className="text-sm text-gray-500 mt-1">Lower numbers appear first</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product Name *
          </label>
          <input
            type="text"
            value={formData.productName}
            onChange={(e) => setFormData({...formData, productName: e.target.value})}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Brand *
          </label>
          <input
            type="text"
            value={formData.shoeBrand}
            onChange={(e) => setFormData({...formData, shoeBrand: e.target.value})}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            className="w-full px-4 py-2 border rounded-lg"
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price ($) *
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stock *
          </label>
          <input
            type="number"
            value={formData.stock}
            onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Available Sizes
        </label>
        <div className="flex flex-wrap gap-2">
          {SIZES.map(size => (
            <button
              key={size}
              type="button"
              onClick={() => {
                const newSizes = formData.sizes.includes(size)
                  ? formData.sizes.filter(s => s !== size)
                  : [...formData.sizes, size]
                setFormData({...formData, sizes: newSizes.sort()})
              }}
              className={`px-4 py-2 rounded-lg border ${
                formData.sizes.includes(size)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isOffer"
            checked={formData.isOffer}
            onChange={(e) => setFormData({...formData, isOffer: e.target.checked})}
            className="rounded"
          />
          <label htmlFor="isOffer" className="text-sm font-medium text-gray-700">
            Is on Offer?
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="buyOneGetOne"
            checked={formData.buyOneGetOne}
            onChange={(e) => setFormData({...formData, buyOneGetOne: e.target.checked})}
            className="rounded"
          />
          <label htmlFor="buyOneGetOne" className="text-sm font-medium text-gray-700">
            Buy 1 Get 1 Free
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isDisabled"
            checked={formData.isDisabled}
            onChange={(e) => setFormData({...formData, isDisabled: e.target.checked})}
            className="rounded"
          />
          <label htmlFor="isDisabled" className="text-sm font-medium text-gray-700">
            Disable Product
          </label>
        </div>
      </div>

      {formData.isOffer && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Offer Price ($)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.offerPrice}
            onChange={(e) => setFormData({...formData, offerPrice: Number(e.target.value)})}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          rows={4}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      <div className="flex justify-end space-x-4 pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : initialData ? 'Update Product' : 'Create Product'}
        </button>
      </div>
    </form>
  )
}