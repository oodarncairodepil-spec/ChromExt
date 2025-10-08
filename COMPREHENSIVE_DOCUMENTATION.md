# Chrome Extension - WhatsApp Integration Project

## Overview
A Chrome MV3 extension with side panel React app that integrates with WhatsApp Web for product management, template creation, and user management.

## Recent Updates

### UI Improvements (Latest)
- **Removed "Send to WhatsApp" button** from ProductDetail.tsx for cleaner interface
- **Updated header styling** in UserCreate.tsx and TemplateCreate.tsx:
  - Changed from `h1` to `h2` elements
  - Updated button styling with consistent design
  - Replaced "Back" buttons with "Cancel" buttons
  - Applied modern styling with proper spacing and colors

### Build Process Fixes
- **Resolved build directory confusion**: 
  - `npm run dev` creates builds in `chrome-mv3-prod-dev` (development)
  - `npm run build` creates builds in `chrome-mv3-prod` (production)
  - Both directories now contain the latest UI changes

### Image Compression System
- **Fixed Node.js compatibility issues** in batch image processing:
  - Created `nodeImageCompression.ts` and `nodeImageCompression.js` using Sharp library
  - Updated `batch-compress-images.js` and `batchResizeImages.ts` scripts
  - Successfully processed 49 images, compressed 36, skipped 13 already optimized
  - Maintained browser-based compression in `imageCompression.ts` for frontend components

### Database Improvements
- **Fixed RLS policies** for quick_reply_templates to allow anonymous access for preview generation
- **Enhanced template preview functionality** for WhatsApp integration

## Project Structure

### Core Directories
```
src/
├── components/          # Reusable UI components
├── pages/              # Main application pages
├── utils/              # Utility functions
├── contexts/           # React contexts
├── lib/                # External library configurations
└── sidepanel/          # Extension sidepanel implementation
```

### Key Files
- `src/pages/ProductDetail.tsx` - Product management with image upload
- `src/pages/UserCreate.tsx` - User registration with updated header
- `src/pages/TemplateCreate.tsx` - Template creation with updated header
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
   - Run database migration scripts in `database/` directory
   - Ensure RLS policies are properly configured

4. **Development**:
   ```bash
   npm run dev
   ```

5. **Load extension**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable Developer mode
   - Load unpacked extension from `build/chrome-mv3-prod-dev/` (development) or `build/chrome-mv3-prod/` (production)

## Features

### Product Management
- Create and manage products with variants
- Image upload and compression (under 300KB for WhatsApp compatibility)
- SKU generation and management
- Product sharing capabilities

### Template System
- Quick reply template creation
- Template preview generation
- WhatsApp integration for template sharing
- Image support in templates

### User Management
- User registration and profile management
- Role-based access control
- Integration with Supabase authentication

### WhatsApp Integration
- Automatic message composition
- Product sharing via WhatsApp Web
- Template deployment
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
- Verify RLS policies for template access
- Check Supabase connection configuration
- Ensure proper environment variables

## Contributing

1. Follow the established code structure
2. Test changes in both development and production builds
3. Update documentation for significant changes
4. Ensure image compression works in both environments
5. Verify WhatsApp integration functionality

## License

This project is proprietary software developed for internal use.