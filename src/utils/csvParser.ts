import Papa from 'papaparse'

export interface CSVRow {
  product_name: string
  description?: string
  price: string
  stock?: string
  is_digital?: string
  weight?: string
  status?: string
  has_notes?: string
  image_url?: string
  variant_tier_1_name?: string
  variant_tier_1_value?: string
  variant_tier_2_name?: string
  variant_tier_2_value?: string
  variant_tier_3_name?: string
  variant_tier_3_value?: string
  variant_price?: string
  variant_stock?: string
  variant_weight?: string
  variant_sku?: string
  variant_image_url?: string
  variant_is_active?: string
  variant_description?: string
}

export interface ValidationError {
  row: number
  field: string
  message: string
}

export interface ParsedProductRow extends CSVRow {
  rowNumber: number
  errors: ValidationError[]
}

export interface ProductGroup {
  productName: string
  baseRow: ParsedProductRow
  variantRows: ParsedProductRow[]
  hasVariants: boolean
}

/**
 * Generate CSV template with headers and example rows
 */
export function generateCSVTemplate(): string {
  const headers = [
    'product_name',
    'description',
    'price',
    'stock',
    'is_digital',
    'weight',
    'status',
    'has_notes',
    'image_url',
    'variant_tier_1_name',
    'variant_tier_1_value',
    'variant_tier_2_name',
    'variant_tier_2_value',
    'variant_tier_3_name',
    'variant_tier_3_value',
    'variant_price',
    'variant_stock',
    'variant_weight',
    'variant_sku',
    'variant_image_url',
    'variant_is_active',
    'variant_description'
  ]

  // Example rows
  const examples = [
    // Simple product example
    [
      'Simple Product',
      'This is a simple product without variants',
      '50000',
      '100',
      'false',
      '500',
      'active',
      'false',
      'https://example.com/image1.jpg',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ],
    // Product with variants example
    [
      'T-Shirt',
      'Comfortable cotton t-shirt',
      '150000',
      '0',
      'false',
      '200',
      'active',
      'false',
      'https://example.com/tshirt.jpg',
      'Color',
      'Red',
      'Size',
      'Large',
      '',
      '',
      '150000',
      '10',
      '250',
      'TSHIRT-RED-LG',
      'https://example.com/tshirt-red-lg.jpg',
      'true',
      'Red large size variant'
    ],
    [
      'T-Shirt',
      'Comfortable cotton t-shirt',
      '150000',
      '0',
      'false',
      '200',
      'active',
      'false',
      'https://example.com/tshirt.jpg',
      'Color',
      'Blue',
      'Size',
      'Large',
      '',
      '',
      '150000',
      '15',
      '250',
      'TSHIRT-BLUE-LG',
      'https://example.com/tshirt-blue-lg.jpg',
      'true',
      'Blue large size variant'
    ]
  ]

  const csv = Papa.unparse({
    fields: headers,
    data: examples
  })

  return csv
}

/**
 * Download CSV template
 */
export function downloadCSVTemplate(): void {
  const csv = generateCSVTemplate()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', 'product_bulk_upload_template.csv')
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Validate a single product row
 */
export function validateProductRow(row: any, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = []

  // Required fields
  if (!row.product_name || !row.product_name.trim()) {
    errors.push({
      row: rowNumber,
      field: 'product_name',
      message: 'Product name is required'
    })
  }

  if (!row.price || !row.price.trim()) {
    errors.push({
      row: rowNumber,
      field: 'price',
      message: 'Price is required'
    })
  } else {
    const price = parseFloat(row.price.toString().replace(/,/g, ''))
    if (isNaN(price) || price <= 0) {
      errors.push({
        row: rowNumber,
        field: 'price',
        message: 'Price must be a valid positive number'
      })
    }
  }

  // Optional numeric fields
  if (row.stock && row.stock.trim()) {
    const stock = parseFloat(row.stock.toString().replace(/,/g, ''))
    if (isNaN(stock) || stock < 0) {
      errors.push({
        row: rowNumber,
        field: 'stock',
        message: 'Stock must be a valid non-negative number'
      })
    }
  }

  if (row.weight && row.weight.trim()) {
    const weight = parseFloat(row.weight.toString().replace(/,/g, ''))
    if (isNaN(weight) || weight < 0) {
      errors.push({
        row: rowNumber,
        field: 'weight',
        message: 'Weight must be a valid non-negative number'
      })
    }
  }

  // Boolean fields
  if (row.is_digital && row.is_digital.trim()) {
    const isDigital = row.is_digital.toLowerCase().trim()
    if (isDigital !== 'true' && isDigital !== 'false' && isDigital !== '') {
      errors.push({
        row: rowNumber,
        field: 'is_digital',
        message: 'is_digital must be "true" or "false"'
      })
    }
  }

  if (row.has_notes && row.has_notes.trim()) {
    const hasNotes = row.has_notes.toLowerCase().trim()
    if (hasNotes !== 'true' && hasNotes !== 'false' && hasNotes !== '') {
      errors.push({
        row: rowNumber,
        field: 'has_notes',
        message: 'has_notes must be "true" or "false"'
      })
    }
  }

  // Status validation
  if (row.status && row.status.trim()) {
    const validStatuses = ['active', 'inactive', 'draft']
    if (!validStatuses.includes(row.status.toLowerCase().trim())) {
      errors.push({
        row: rowNumber,
        field: 'status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      })
    }
  }

  // Variant validation - if variant values are provided, tier names must be provided
  const hasVariantValue1 = row.variant_tier_1_value && row.variant_tier_1_value.trim()
  const hasVariantValue2 = row.variant_tier_2_value && row.variant_tier_2_value.trim()
  const hasVariantValue3 = row.variant_tier_3_value && row.variant_tier_3_value.trim()

  if (hasVariantValue1 && (!row.variant_tier_1_name || !row.variant_tier_1_name.trim())) {
    errors.push({
      row: rowNumber,
      field: 'variant_tier_1_name',
      message: 'variant_tier_1_name is required when variant_tier_1_value is provided'
    })
  }

  if (hasVariantValue2 && (!row.variant_tier_2_name || !row.variant_tier_2_name.trim())) {
    errors.push({
      row: rowNumber,
      field: 'variant_tier_2_name',
      message: 'variant_tier_2_name is required when variant_tier_2_value is provided'
    })
  }

  if (hasVariantValue3 && (!row.variant_tier_3_name || !row.variant_tier_3_name.trim())) {
    errors.push({
      row: rowNumber,
      field: 'variant_tier_3_name',
      message: 'variant_tier_3_name is required when variant_tier_3_value is provided'
    })
  }

  // Variant price/stock validation
  if (row.variant_price && row.variant_price.trim()) {
    const variantPrice = parseFloat(row.variant_price.toString().replace(/,/g, ''))
    if (isNaN(variantPrice) || variantPrice <= 0) {
      errors.push({
        row: rowNumber,
        field: 'variant_price',
        message: 'variant_price must be a valid positive number'
      })
    }
  }

  if (row.variant_stock && row.variant_stock.trim()) {
    const variantStock = parseFloat(row.variant_stock.toString().replace(/,/g, ''))
    if (isNaN(variantStock) || variantStock < 0) {
      errors.push({
        row: rowNumber,
        field: 'variant_stock',
        message: 'variant_stock must be a valid non-negative number'
      })
    }
  }

  // Variant weight validation
  if (row.variant_weight && row.variant_weight.trim()) {
    const variantWeight = parseFloat(row.variant_weight.toString().replace(/,/g, ''))
    if (isNaN(variantWeight) || variantWeight < 0) {
      errors.push({
        row: rowNumber,
        field: 'variant_weight',
        message: 'variant_weight must be a valid non-negative number'
      })
    }
  }

  // Variant SKU validation
  if (row.variant_sku && row.variant_sku.trim()) {
    if (row.variant_sku.trim().length === 0) {
      errors.push({
        row: rowNumber,
        field: 'variant_sku',
        message: 'variant_sku cannot be empty if provided'
      })
    }
  }

  // Variant is_active validation
  if (row.variant_is_active && row.variant_is_active.trim()) {
    const isActive = row.variant_is_active.toLowerCase().trim()
    if (isActive !== 'true' && isActive !== 'false' && isActive !== '') {
      errors.push({
        row: rowNumber,
        field: 'variant_is_active',
        message: 'variant_is_active must be "true" or "false"'
      })
    }
  }

  return errors
}

/**
 * Parse CSV file and return structured data
 */
export async function parseCSVFile(file: File): Promise<{
  products: ProductGroup[]
  errors: ValidationError[]
  totalRows: number
}> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data as any[]
          const parsedRows: ParsedProductRow[] = []
          const allErrors: ValidationError[] = []

          // Validate each row
          rows.forEach((row, index) => {
            const rowNumber = index + 2 // +2 because CSV has header and is 1-indexed
            const errors = validateProductRow(row, rowNumber)
            
            parsedRows.push({
              ...row,
              rowNumber,
              errors
            })

            allErrors.push(...errors)
          })

          // Group rows by product name
          const productMap = new Map<string, ProductGroup>()

          parsedRows.forEach((row) => {
            if (row.errors.length > 0) {
              return // Skip rows with validation errors
            }

            const productName = row.product_name.trim()
            
            // Check if this row has variant data
            const hasVariants = !!(
              (row.variant_tier_1_value && row.variant_tier_1_value.trim()) ||
              (row.variant_tier_2_value && row.variant_tier_2_value.trim()) ||
              (row.variant_tier_3_value && row.variant_tier_3_value.trim())
            )

            if (!productMap.has(productName)) {
              productMap.set(productName, {
                productName,
                baseRow: row,
                variantRows: [],
                hasVariants: false
              })
            }

            const group = productMap.get(productName)!

            if (hasVariants) {
              group.hasVariants = true
              group.variantRows.push(row)
            } else if (group.variantRows.length === 0) {
              // First row without variants becomes the base row
              group.baseRow = row
            }
          })

          const products = Array.from(productMap.values())

          resolve({
            products,
            errors: allErrors,
            totalRows: rows.length
          })
        } catch (error) {
          reject(error)
        }
      },
      error: (error) => {
        reject(error)
      }
    })
  })
}

/**
 * Group rows into products with variants
 */
export function groupProductsByVariant(rows: ParsedProductRow[]): ProductGroup[] {
  const productMap = new Map<string, ProductGroup>()

  rows.forEach((row) => {
    if (row.errors.length > 0) {
      return // Skip rows with validation errors
    }

    const productName = row.product_name.trim()
    
    // Check if this row has variant data
    const hasVariants = !!(
      (row.variant_tier_1_value && row.variant_tier_1_value.trim()) ||
      (row.variant_tier_2_value && row.variant_tier_2_value.trim()) ||
      (row.variant_tier_3_value && row.variant_tier_3_value.trim())
    )

    if (!productMap.has(productName)) {
      productMap.set(productName, {
        productName,
        baseRow: row,
        variantRows: [],
        hasVariants: false
      })
    }

    const group = productMap.get(productName)!

    if (hasVariants) {
      group.hasVariants = true
      group.variantRows.push(row)
    } else if (group.variantRows.length === 0) {
      // First row without variants becomes the base row
      group.baseRow = row
    }
  })

  return Array.from(productMap.values())
}

