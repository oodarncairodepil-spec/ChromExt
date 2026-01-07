# Chrome Extension - WhatsApp Integration Project

## Overview
A Chrome MV3 extension with side panel React app that integrates with WhatsApp Web for product management, template creation, and user management.

## Recent Updates

### Staff Account Role Access System (Latest) 🆕
- **Comprehensive Staff Management**:
  - Created `staff_accounts` and `staff_permissions` tables with proper RLS policies
  - Implemented role-based access control (RBAC) with granular permission flags
  - Staff accounts can be created, activated/deactivated, and deleted by owners
  - Staff permissions include: product management, order access, template control, cart usage, user management, and system settings

- **Permission System Features**:
  - Boolean-based permission flags for fine-grained access control
  - Staff can only see their owner's data (products, orders, templates, customers)
  - Staff can only see their own orders (unless `can_view_all_orders` is enabled)
  - Permission context (`PermissionContext`) provides real-time permission checks
  - Protected routes automatically redirect unauthorized users

- **Staff Management UI**:
  - Mobile-responsive staff management page with table (desktop) and card (mobile) views
  - Edit permissions dialog with organized permission groups
  - Deactivate/Activate and Delete account functions moved to edit dialog
  - Confirmation dialogs for destructive actions
  - Auto-email confirmation for staff accounts using Admin API

- **Database Migrations**:
  - `create-staff-accounts.sql` - Creates staff_accounts table with RLS
  - `create-staff-permissions.sql` - Creates staff_permissions table with all permission flags
  - `add-created-by-to-orders.sql` - Tracks which user (owner/staff) created each order
  - `fix-staff-rls-policies.sql` - Updates RLS policies for products, orders, templates, and users to allow staff access

- **Integration Points**:
  - All pages check permissions before showing/hiding UI elements
  - Header menu items filtered by permissions
  - Tab bar navigation respects permission settings
  - Data queries automatically filter by `ownerId` for staff users

### Bulk Product Creation Feature 🆕
- **CSV Template System**:
  - Download CSV template with all required and optional fields
  - Support for simple products and products with variants
  - Variant customization fields: `variant_weight`, `variant_sku`, `variant_image_url`, `variant_is_active`, `variant_description`

- **Bulk Upload Process**:
  - Drag & drop or file picker for CSV upload
  - Real-time validation with detailed error reporting
  - Preview parsed products before creation
  - Progress tracking during creation process
  - Results summary with successes and errors

- **Implementation Details**:
  - `BulkProductCreate.tsx` - Main UI component
  - `csvParser.ts` - CSV parsing and validation logic
  - `bulkProductCreator.ts` - Product creation orchestration
  - Handles image downloads from URLs and uploads to Supabase storage
  - Creates products, variants, and variant options in correct order

### HTML to Plain Text Formatting 🆕
- **WhatsApp Message Formatting**:
  - Created `htmlToPlainText()` utility function in `htmlToText.ts`
  - Converts Quill editor HTML to readable plain text
  - Preserves paragraph breaks and formatting
  - Handles HTML entities and special characters

- **Integration Points**:
  - Product descriptions converted when sending to WhatsApp
  - Template messages formatted for clean text output
  - Order summaries (checkout) formatted for WhatsApp delivery
  - Applied in `ogUtils.ts` for all message generation functions

### User Detail Page Enhancements 🆕
- **Tab Navigation**:
  - Two tabs: "User Details" and "Order History"
  - Order history shows all orders for the customer
  - Clickable order cards navigate to order detail page

- **Users Page Improvements**:
  - Added order count display on user cards
  - Shows "X order(s)" with clipboard icon
  - Consistent order card design matching Orders page
  - Courier logo display aligned with price section

### Variant Quick Reply Templates 🆕
- **Variant-Specific Templates**:
  - Each product variant can have its own quick reply template
  - Template section integrated into variant cards in ProductDetail
  - View, edit, or create template directly from variant card

- **Database Schema**:
  - Added `variant_id` column to `quick_reply_templates` table
  - Added `description` column to `product_variants` table
  - Foreign key relationship with cascade delete
  - Check constraint ensures `product_id` is set when `variant_id` is set

- **Migrations**:
  - `add-variant-id-to-templates.sql` - Adds variant_id column
  - `add-variant-description.sql` - Adds description column to variants

### Template Creation Simplification 🆕
- **Removed Title Field**:
  - Title input field removed from TemplateCreate page
  - Title auto-generated from first 50 characters of message
  - Simplified form with only message, preview content, image, and active status

### Cart Enhancements 🆕
- **UI/UX Improvements**:
  - Discount percentage display: "Discount (10%) -Rp 5.000"
  - Shipping Fee moved above Discount in summary
  - Partial Payment amount color changed to green (matching discount)
  - Better visual hierarchy and consistency

- **Order Status Update**:
  - Draft orders automatically change to "New" status on checkout
  - Ensures proper order lifecycle management

### WhatsApp Text Formatting Improvements 🆕
- **Lexical Editor Support**:
  - Updated `background.ts` to properly handle WhatsApp's Lexical editor
  - Text insertion preserves newlines using Lexical-compatible DOM structure
  - Each line wrapped in `<p>` with `<span data-lexical-text="true">` structure
  - Proper event dispatching for Lexical editor recognition

- **Image Handling**:
  - Image copied to clipboard from side panel context (user interaction)
  - Manual paste required (Ctrl+V / Cmd+V)
  - Success message: "Text sent to WhatsApp! Image copied to clipboard - paste it manually"
  - Removed automatic paste attempts to prevent upload menu opening

### Send Functionality Improvements
- **Sequential Sending Implementation**: Created `improvedImageUtils.ts` with sequential sending approach that sends text first, then image
- **Enhanced Error Handling**: Added retry mechanism with exponential backoff for clipboard operations
- **Better User Feedback**: Improved status messages and error reporting for send operations
- **Updated Components**: Modified ProductDetail.tsx, Templates.tsx, and InvoiceModal.tsx to use the improved sending function
- **Clipboard Validation**: Added verification steps to ensure images are properly copied to clipboard before sending
- **Uninterruptible Loading Dialogs**: Added `LoadingDialog` component to prevent user interaction during send operations

- **Product Send Button Improvements**:
  - Fixed `generateProductMessage` function to send product name, description, and price instead of preview URLs
  - Updated `generateVariantMessage` function to include variant details, product description, and price
  - Removed preview URL generation from product and variant sharing functionality
  - Enhanced message content to provide complete product information to buyers

- **Template Send Button Improvements**:
  - Fixed `generateWhatsAppMessage` function to remove preview URLs from template messages
  - Ensured template messages only contain the template content without additional links
  - Improved template sharing experience by focusing on message content

- **Invoice Modal Improvements**:
  - Uses same sending process as Products and Templates pages
  - HTML to plain text formatting for order summaries
  - Consistent user experience across all send operations

- **Cart Page Enhancement**:
  - Added "Add Product" button next to "Load draft order" button in Cart page
  - Improved navigation flow allowing users to easily add products from cart view
  - Enhanced user experience with better product management accessibility

- **WhatsApp Integration Improvements**:
  - Updated `src/utils/ogUtils.ts` with improved message generation functions
  - Enhanced clipboard and WhatsApp Web integration for better message delivery
  - Maintained image copying functionality while improving text message content

### Integration Page Enhancements
- **Card-Style Product Display**:
  - Updated Integration page to display imported products in modern card layout
  - Implemented consistent design matching the Products page
  - Added proper image display with fallback for missing images
  - Enhanced product information layout with larger names and descriptions

- **Rupiah Currency Formatting**:
  - Implemented proper Indonesian Rupiah (IDR) formatting with thousand separators
  - Applied consistent "Rp" prefix across all price displays
  - Updated both single product and variant price formatting
  - Used `toLocaleString('id-ID')` for proper locale formatting

- **Enhanced Variant Creation**:
  - Fixed variant creation logic to extract meaningful names from SKUs
  - Implemented pattern matching for colors (Red, Blue, Green, etc.) and sizes (S, M, L, XL, etc.)
  - Added fallback logic for variants without recognizable patterns
  - Created descriptive `variant_tier_1_value` and `full_product_name` for better organization
  - Improved variant display with proper price formatting and details

- **UI/UX Improvements**:
  - Added hover effects and modern card styling
  - Implemented horizontal layout with organized product details
  - Enhanced status badges and weight display
  - Improved variant information presentation
  - Added clean layout for product specifications

### Database Schema & Authentication Improvements
- **Database Schema Enhancements**:
  - Added `user_id` column to `users` table referencing `auth.users(id)`
  - Added `user_id` column to `variant_options` table for data isolation
  - Added `user_id` column to `product_variants` table for proper relationships
  - Created comprehensive migration scripts for schema updates
  - Implemented proper data population based on order relationships

- **Authentication & Data Security Fixes**:
  - Fixed Users.tsx component to display all users associated with shop owner
  - Updated component logic from order-based filtering to user_id-based filtering
  - Resolved authentication issues in UserDetail.tsx, UserCreate.tsx, Products.tsx
  - Implemented proper user data filtering to ensure users only access their own data
  - Enhanced RLS policies for improved data security

- **Migration Scripts Created**:
  - `add-user-id-to-users-table.sql` (in `supabase/migrations/`) - Adds user_id column to users table
  - `run-add-user-id-to-users-migration.js` (in `scripts/database/`) - Executes users table migration
  - `check-users-data-integrity.js` (in `scripts/database/`) - Verifies user_id values and relationships
  - `populate-users-user-id.js` (in `scripts/database/`) - Populates user_id based on order data
  - `assign-remaining-users.js` (in `scripts/database/`) - Assigns unassociated users to default seller

- **Sign-in Page Streamlining**:
  - Removed "Or" divider section for cleaner interface
  - Removed "Use Manual Token Instead" link
  - Added automatic redirect for unverified users to Email Confirmation page
  - Simplified login flow with better user experience

- **Email Confirmation Page Updates**:
  - Updated page title from "Manual Token Confirmation" to "Email Confirmation"
  - Removed instructional description paragraph
  - Removed blue instruction box with token steps
  - Streamlined interface for better usability

- **Previous UI Improvements**:
  - Removed "Send to WhatsApp" button from ProductDetail.tsx for cleaner interface
  - Updated header styling in UserCreate.tsx and TemplateCreate.tsx
  - Changed from `h1` to `h2` elements with consistent design
  - Replaced "Back" buttons with "Cancel" buttons

### Build Process Fixes
- **Resolved build directory confusion**: 
  - `npm run dev` creates builds in `chrome-mv3-prod-dev` (development)
  - `npm run build` creates builds in `chrome-mv3-prod` (production)
  - Both directories now contain the latest UI changes
- **Production Build Updates**:
  - Updated production build to include latest integration improvements
  - Ensured variant creation enhancements are included in build
  - Verified card-style display and Rupiah formatting in production

### Image Compression System
- **Fixed Node.js compatibility issues** in batch image processing:
  - Created `nodeImageCompression.ts` and `nodeImageCompression.js` using Sharp library
  - Updated `batch-compress-images.js` and `batchResizeImages.ts` scripts
  - Successfully processed 49 images, compressed 36, skipped 13 already optimized
  - Maintained browser-based compression in `imageCompression.ts` for frontend components

### Database Improvements
- **Schema Enhancements**:
  - Added `user_id` columns to `users`, `variant_options`, and `product_variants` tables
  - Implemented proper foreign key relationships to `auth.users(id)`
  - Created comprehensive migration scripts for safe schema updates
  - Enhanced data isolation and security through proper user associations

- **Data Migration & Population**:
  - Automated population of `user_id` values based on existing order relationships
  - Created verification scripts to ensure data integrity
  - Implemented fallback assignment for users without order history

- **RLS Policy Updates**:
  - Fixed RLS policies for quick_reply_templates to allow anonymous access for preview generation
  - Enhanced template preview functionality for WhatsApp integration
  - Improved security policies for user data access control

### Project Organization & Cleanup
- **Script Organization**:
  - Moved all utility scripts (check-*.js, fix-*.js, debug-*.js, create-*.js, diagnose-*.js, restore-*.js) to `scripts/` folder
  - Organized scripts into subdirectories: `database/` and `maintenance/`
  - Created `scripts/README.md` documenting script organization
  - Test HTML files moved to `scripts/` folder (test-clipboard.html, test-image-compression.html, etc.)

- **Code Cleanup**:
  - Removed excessive console.log statements from production code
  - Wrapped debug logs in `process.env.NODE_ENV === 'development'` checks
  - Fixed 406 errors by using `.maybeSingle()` instead of `.single()` for optional queries
  - Removed instrumentation and debug fetch calls

- **Build Process Automation**:
  - Version increment automation in `package.json` build script
  - Automatically increments patch version in `src/manifest.json`
  - Syncs version to `build/chrome-mv3-prod-prod/manifest.json` after build
  - Ensures version consistency across all manifest files

- **Header Improvements**:
  - Removed "QuickOrder Tab Chrome Extension" text section
  - Removed "Collapse" button
  - Permission-based menu item visibility
  - Cleaner, more focused header design

## Project Structure

### Core Directories
```
src/
├── components/          # Reusable UI components
│   ├── ProtectedRoute.tsx      # Route protection based on permissions
│   ├── StaffPermissionEditor.tsx # Staff permission management UI
│   └── LoadingDialog.tsx        # Uninterruptible loading modal
├── pages/              # Main application pages
│   ├── BulkProductCreate.tsx    # Bulk product creation from CSV
│   ├── StaffManagement.tsx     # Staff account management
│   └── [other pages]
├── utils/              # Utility functions
│   ├── htmlToText.ts           # HTML to plain text conversion
│   ├── csvParser.ts            # CSV parsing and validation
│   ├── bulkProductCreator.ts   # Bulk product creation logic
│   ├── staffUtils.ts           # Staff account utilities
│   └── improvedImageUtils.ts  # Enhanced WhatsApp sending
├── contexts/           # React contexts
│   ├── AuthContext.tsx         # Authentication context
│   └── PermissionContext.tsx    # Permission and role context
├── lib/                # External library configurations
└── sidepanel/          # Extension sidepanel implementation

scripts/                # Utility and maintenance scripts
├── database/           # Database-related scripts
│   ├── check-*.js      # Database check scripts
│   ├── fix-*.js        # Database fix scripts
│   └── debug-*.js      # Database debugging
├── maintenance/        # Maintenance scripts
│   └── [image/product maintenance]
├── test-*.html         # Test HTML files
└── README.md           # Script organization documentation

supabase/               # Supabase project structure
├── migrations/          # SQL migration files (all migrations here)
│   ├── create-staff-accounts.sql
│   ├── create-staff-permissions.sql
│   ├── add-created-by-to-orders.sql
│   ├── add-variant-id-to-templates.sql
│   ├── add-variant-description.sql
│   └── fix-staff-rls-policies.sql
├── functions/           # Supabase Edge Functions
└── config.toml          # Supabase CLI configuration
```

### Key Files
- `src/pages/ProductDetail.tsx` - Product management with variant templates
- `src/pages/BulkProductCreate.tsx` - Bulk product creation from CSV
- `src/pages/StaffManagement.tsx` - Staff account and permission management
- `src/pages/UserDetail.tsx` - User details with order history tabs
- `src/pages/TemplateCreate.tsx` - Template creation (auto-title generation)
- `src/utils/htmlToText.ts` - HTML to plain text conversion for WhatsApp
- `src/utils/csvParser.ts` - CSV parsing and validation
- `src/utils/bulkProductCreator.ts` - Bulk product creation orchestration
- `src/utils/staffUtils.ts` - Staff account management utilities
- `src/utils/improvedImageUtils.ts` - Enhanced WhatsApp sending with clipboard
- `src/contexts/PermissionContext.tsx` - Permission and role management
- `src/components/ProtectedRoute.tsx` - Route protection component
- `src/components/StaffPermissionEditor.tsx` - Permission editor UI
- `src/background.ts` - Service worker with Lexical editor support
- `src/utils/imageCompression.ts` - Browser-based image compression
- `scripts/nodeImageCompression.js` - Node.js image compression utilities

## Build Commands

### Development
```bash
npm run dev              # Development build (outputs to chrome-mv3-prod-dev)
npm run dev-original     # Original plasmo dev command
```

### Production
```bash
npm run build           # Production build (outputs to chrome-mv3-prod)
npm run package         # Package for distribution
```

### Utilities
```bash
npm run resize-images   # Batch resize images using TypeScript
node scripts/batch-compress-images.js  # Batch compress images using Node.js
```

## Installation & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment setup**:
   - Copy `.env.example` to `.env`
   - Configure Supabase credentials

3. **Database setup**:
   - Run database migration scripts in `supabase/migrations/` directory in order:
     - `create-staff-accounts.sql` - Creates staff_accounts table
     - `create-staff-permissions.sql` - Creates staff_permissions table
     - `add-created-by-to-orders.sql` - Adds created_by tracking to orders
     - `add-variant-id-to-templates.sql` - Adds variant_id to templates
     - `add-variant-description.sql` - Adds description to product_variants
     - `fix-staff-rls-policies.sql` - Updates RLS for staff data access
   - Execute user_id migration scripts (if not already done):
     - `add-user-id-to-users-table.sql` (in `supabase/migrations/`)
     - `run-add-user-id-to-users-migration.js` (in `scripts/database/`)
     - `populate-users-user-id.js` (in `scripts/database/`)
   - Ensure RLS policies are properly configured
   - Verify data integrity with `check-users-data-integrity.js` (in `scripts/database/`)

4. **Development**:
   ```bash
   npm run dev
   ```

5. **Load extension**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable Developer mode
   - Load unpacked extension from `build/chrome-mv3-prod-dev/` (development) or `build/chrome-mv3-prod/` (production)

## Known Issues & Investigations

### Clipboard Image Copying & Simultaneous Text/Image Sending - RESOLVED ✅

**Previous Issues:**
- Race conditions between clipboard operations and WhatsApp DOM manipulation
- Timing issues with image pasting before WhatsApp was ready
- Inconsistent clipboard behavior across different browsers
- Complex fallback logic that was difficult to debug

**Implemented Solutions:**

**1. Sequential Sending Approach (`improvedImageUtils.ts`):**
- `sendToWhatsAppSequential()`: Sends text first, waits 2 seconds, then sends image
- Eliminates race conditions by separating text and image operations
- Provides clear status feedback for each step

**2. Enhanced Clipboard Operations:**
- `copyImageToClipboardWithRetry()`: Retry mechanism with exponential backoff (up to 3 attempts)
- Timeout protection (10 second limit) for image fetching
- Blob validation (size limits, MIME type verification)
- Clipboard verification to ensure image was actually copied

**3. Improved Error Handling:**
- Detailed error messages for different failure scenarios
- Graceful fallback to clipboard-only operations when WhatsApp is not available
- Better user feedback with specific status messages

**4. Updated Components:**
- ProductDetail.tsx: Now uses `improvedSendToWhatsApp()` for better reliability
- Templates.tsx: Enhanced with sequential sending approach
- InvoiceModal.tsx: Simplified logic using improved utilities

**Current Status:** The send functionality has been significantly improved with better reliability and user experience.

## Features

### Product Management
- Create and manage products with variants
- **Bulk Product Creation**: Upload CSV file to create multiple products with variants at once
- Image upload and compression (under 300KB for WhatsApp compatibility)
- SKU generation and management
- Product sharing capabilities
- Variant-specific quick reply templates

### Integration System
- **API Product Import**: Import products from external APIs with credential management
- **Card-Style Display**: Modern card layout for imported products matching main product page
- **Intelligent Variant Creation**: Automatic extraction of variant information from SKUs
- **Currency Formatting**: Proper Indonesian Rupiah formatting with thousand separators
- **Batch Product Creation**: Efficient creation of multiple products with variants in Supabase
- **Error Handling**: Comprehensive error handling for API failures and data validation

### Template System
- Quick reply template creation (auto-title generation from message)
- **Variant-Specific Templates**: Each product variant can have its own template
- Template preview generation
- WhatsApp integration for template sharing
- Image support in templates
- HTML to plain text formatting for clean WhatsApp messages

### User Management
- User registration and profile management
- **Staff Account System**: Owners can create and manage staff accounts
- **Role-Based Access Control (RBAC)**: Granular permissions for staff accounts
- **Permission-Based UI**: UI elements show/hide based on user permissions
- **Data Isolation**: Staff can only access their owner's data
- User detail page with order history tab
- Order count display on user cards
- Integration with Supabase authentication

### WhatsApp Integration
- Automatic message composition with Lexical editor support
- **Text Formatting**: Preserves newlines and formatting in WhatsApp messages
- **HTML to Plain Text**: Converts rich text descriptions to readable plain text
- Product sharing via WhatsApp Web
- Template deployment
- Invoice/order summary sharing
- Image copying to clipboard for manual pasting
- Phone number extraction and validation

## Technical Stack

- **Frontend**: React 18.2.0, TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Plasmo Framework
- **Database**: Supabase
- **Image Processing**: Sharp (Node.js), Canvas API (Browser)
- **Extension**: Chrome MV3

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow React best practices
- Maintain consistent component structure
- Use Tailwind for styling

### Build Process
- Use `npm run dev` for active development
- Run `npm run build` before production deployment
- Test in both development and production builds
- Reload extension after significant changes

### Image Handling
- Browser components use `imageCompression.ts`
- Node.js scripts use `nodeImageCompression.js`
- Target compression: under 300KB for WhatsApp compatibility
- Support for JPEG, PNG, WebP formats

## Troubleshooting

### Build Issues
- If changes aren't visible, check which build directory you're loading
- Development builds go to `chrome-mv3-prod-dev`
- Production builds go to `chrome-mv3-prod`
- Always reload extension after updates

### Image Processing
- Node.js scripts require Sharp library installation
- Browser compression uses Canvas API
- Check file size limits (300KB for WhatsApp)

### Database Issues
- **Schema Migration Issues**:
  - If user_id columns are missing, run migration scripts in order
  - Check foreign key constraints to auth.users table
  - Verify data population completed successfully
  - Use verification scripts to check data integrity

- **Authentication & Data Access**:
  - Verify RLS policies for template access
  - Check user_id associations for proper data filtering
  - Ensure Users.tsx displays all associated users correctly

- **Connection & Configuration**:
  - Check Supabase connection configuration
  - Ensure proper environment variables (including `PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` for Admin API)
  - Verify database permissions for migration scripts

- **Staff Account Issues**:
  - If staff cannot see products/orders/templates, check RLS policies
  - Verify `ownerId` is correctly set in PermissionContext
  - Ensure `fix-staff-rls-policies.sql` has been executed
  - Check that staff accounts are active (`is_active = true`)
  - Verify permissions are set correctly in `staff_permissions` table

- **406 Not Acceptable Errors**:
  - Use `.maybeSingle()` instead of `.single()` for optional queries
  - Check RLS policies if queries return 406 errors
  - Verify table exists and user has proper permissions

- **WhatsApp Sending Issues**:
  - Ensure WhatsApp Web is open and active
  - Check that clipboard API has proper permissions
  - Verify image is copied to clipboard before attempting paste
  - Use manual paste (Ctrl+V / Cmd+V) if automatic paste fails

## Contributing

1. Follow the established code structure
2. Test changes in both development and production builds
3. Update documentation for significant changes
4. Ensure image compression works in both environments
5. Verify WhatsApp integration functionality
6. Test permission-based access control for new features
7. Ensure RLS policies are updated for new data access patterns
8. Use `.maybeSingle()` for optional database queries to avoid 406 errors
9. Wrap debug console.log statements in `process.env.NODE_ENV === 'development'` checks
10. Update version in `src/manifest.json` (or let build script auto-increment)

## License

This project is proprietary software developed for internal use.