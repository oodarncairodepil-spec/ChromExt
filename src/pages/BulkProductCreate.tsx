import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { downloadCSVTemplate, parseCSVFile, ProductGroup, ValidationError } from '../utils/csvParser'
import { createProductsFromBulkData, Progress } from '../utils/bulkProductCreator'
import LoadingDialog from '../components/LoadingDialog'

const BulkProductCreate: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [file, setFile] = useState<File | null>(null)
  const [parsedProducts, setParsedProducts] = useState<ProductGroup[] | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [results, setResults] = useState<{
    successes: Array<{ productName: string; productId?: string }>
    errors: Array<{ productName: string; error?: string }>
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDownloadTemplate = () => {
    downloadCSVTemplate()
  }

  const handleFileSelect = async (selectedFile: File) => {
    // Validate file type
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setFile(selectedFile)
    setError(null)
    setValidationErrors([])
    setParsedProducts(null)
    setResults(null)

    try {
      const parseResult = await parseCSVFile(selectedFile)
      
      if (parseResult.errors.length > 0) {
        setValidationErrors(parseResult.errors)
        setError(`Found ${parseResult.errors.length} validation error(s). Please fix them before proceeding.`)
      } else {
        setValidationErrors([])
      }

      if (parseResult.products.length > 0) {
        setParsedProducts(parseResult.products)
      } else {
        setError('No valid products found in the CSV file')
      }
    } catch (err: any) {
      setError(`Failed to parse CSV file: ${err.message}`)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleStartProcessing = async () => {
    if (!user || !parsedProducts || parsedProducts.length === 0) {
      setError('Invalid data for processing')
      return
    }

    setIsProcessing(true)
    setError(null)
    setResults(null)

    try {
      const result = await createProductsFromBulkData(
        parsedProducts,
        user.id,
        (progressUpdate) => {
          setProgress(progressUpdate)
        }
      )

      setResults(result)
    } catch (err: any) {
      setError(`Failed to create products: ${err.message}`)
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }

  const handleReset = () => {
    setFile(null)
    setParsedProducts(null)
    setValidationErrors([])
    setResults(null)
    setError(null)
    setProgress(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleBackToProducts = () => {
    navigate('/products')
  }

  return (
    <div className="w-full space-y-6 page-container">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Bulk Product Creation</h2>
        <button
          onClick={handleBackToProducts}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Back to Products
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">How to use:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Click "Download Template" to get the CSV template</li>
          <li>Fill the template with your product data in Excel or Google Sheets</li>
          <li>Save the file as CSV format</li>
          <li>Upload the filled CSV file below</li>
          <li>Review validation results and click "Start Processing" to create products</li>
        </ol>
      </div>

      {/* Download Template Button */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Step 1: Download Template</h3>
            <p className="text-sm text-gray-600">
              Download the CSV template file with example rows showing the required format.
            </p>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download Template</span>
          </button>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Step 2: Upload CSV File</h3>
        
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {file ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{file.name}</span>
              </div>
              <p className="text-sm text-gray-600">
                {(file.size / 1024).toFixed(2)} KB
              </p>
              <button
                onClick={handleReset}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div>
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Select CSV file
                </label>
                <input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-gray-500">or drag and drop your CSV file here</p>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">
            Validation Errors ({validationErrors.length})
          </h4>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {validationErrors.map((err, index) => (
              <div key={index} className="text-sm text-yellow-800">
                Row {err.row}, {err.field}: {err.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parsed Products Preview */}
      {parsedProducts && parsedProducts.length > 0 && validationErrors.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Step 3: Review & Process
          </h3>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Found <span className="font-semibold">{parsedProducts.length}</span> product(s) to create:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              {parsedProducts.map((product, index) => (
                <li key={index}>
                  • {product.productName}
                  {product.hasVariants && (
                    <span className="text-gray-500">
                      {' '}({product.variantRows.length} variant{product.variantRows.length !== 1 ? 's' : ''})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={handleStartProcessing}
            disabled={isProcessing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Processing
          </button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Processing Results</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="text-green-600">
                <span className="text-2xl font-bold">{results.successes.length}</span>
                <span className="text-sm ml-1">successful</span>
              </div>
              {results.errors.length > 0 && (
                <div className="text-red-600">
                  <span className="text-2xl font-bold">{results.errors.length}</span>
                  <span className="text-sm ml-1">failed</span>
                </div>
              )}
            </div>

            {results.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-900 mb-2">Errors:</h4>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {results.errors.map((err, index) => (
                    <div key={index} className="text-sm text-red-800">
                      {err.productName}: {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleBackToProducts}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Products
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Upload Another File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Dialog */}
      <LoadingDialog
        isOpen={isProcessing}
        message={
          progress
            ? `Processing ${progress.current} of ${progress.total}: ${progress.currentProduct}`
            : 'Processing products...'
        }
      />
    </div>
  )
}

export default BulkProductCreate

