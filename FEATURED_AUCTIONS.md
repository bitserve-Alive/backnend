# Featured Auctions Implementation

## Overview
This document describes the implementation of the "Featured Auctions" functionality in the auction platform. Featured auctions are highlighted listings that appear prominently in search results and on the homepage.

## Backend Implementation

### 1. Database Schema Changes

#### Auction Model (`models/Auction.js`)
Added the `isFeatured` field to the auction schema:

```javascript
isFeatured: {
  type: Boolean,
  default: false
}
```

#### Database Indexes
Added performance indexes for featured auctions:
- `{ isFeatured: 1 }` - For filtering featured auctions
- `{ isFeatured: 1, status: 1 }` - For combined featured + status queries

### 2. API Endpoints

#### Create Auction (`POST /api/auctions`)
- Accepts `isFeatured` boolean parameter
- Defaults to `false` if not provided
- Only authenticated users can create auctions

#### Update Auction (`PUT /api/auctions/:id`)
- Allows updating `isFeatured` status
- Only auction owners can update their auctions
- Only works for DRAFT or SCHEDULED auctions

#### Get Auctions (`GET /api/auctions`)
- New query parameter: `isFeatured` (true/false)
- New sort option: `sortBy=featured`
- Featured auctions appear first when sorting by featured status

#### Admin Endpoints
- `PUT /api/admin/auctions/:id/featured` - Toggle single auction featured status
- `PUT /api/admin/auctions/bulk-featured` - Bulk update multiple auctions

### 3. Controller Updates

#### Auction Controller (`controllers/auctionController.js`)
- **createAuction**: Handles `isFeatured` field during creation
- **getAuctions**: Supports filtering and sorting by featured status
- **updateAuction**: Allows updating featured status for auction owners

#### Admin Controller (`controllers/adminController.js`)
- **toggleAuctionFeatured**: Admin-only endpoint to toggle featured status
- **bulkUpdateFeatured**: Admin-only bulk update functionality

### 4. Route Configuration

#### Admin Routes (`routes/admin.js`)
```javascript
// Auction Management
router.put('/auctions/:id/featured', adminController.toggleAuctionFeatured);
router.put('/auctions/bulk-featured', adminController.bulkUpdateFeatured);
```

## Frontend Implementation (Admin Dashboard)

### 1. Form Updates

#### ProductsTab Component (`admin-dashboard/src/components/tabs/ProductsTab.tsx`)
- Added `isFeatured` field to `AuctionFormData` interface
- Added Featured Options section in auction form modal
- Checkbox to mark auctions as featured
- Visual indicator (star icon) in auction listings

### 2. UI Features

#### Auction Form Modal
- **Featured Options Section**: Checkbox to mark auction as featured
- **Visual Feedback**: Star icon and description explaining featured benefits
- **Form Validation**: Proper TypeScript typing for boolean values

#### Auction Table
- **Featured Indicator**: Yellow star icon next to featured auction titles
- **Tooltip**: Hover text explaining "Featured Auction"

## Usage Examples

### 1. Creating a Featured Auction

```javascript
// Frontend form data
const auctionData = {
  title: "Premium Vintage Watch",
  description: "Rare collectible timepiece",
  basePrice: 1000,
  categoryId: "category_id_here",
  startTime: "2024-01-01T10:00:00",
  endTime: "2024-01-08T10:00:00",
  isFeatured: true, // Mark as featured
  // ... other fields
};

// API call
POST /api/auctions
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Premium Vintage Watch",
  "description": "Rare collectible timepiece",
  "basePrice": 1000,
  "categoryId": "category_id_here",
  "startTime": "2024-01-01T10:00:00",
  "endTime": "2024-01-08T10:00:00",
  "isFeatured": true
}
```

### 2. Filtering Featured Auctions

```javascript
// Get only featured auctions
GET /api/auctions?isFeatured=true

// Get featured auctions in specific category
GET /api/auctions?isFeatured=true&category=electronics

// Sort by featured status (featured first)
GET /api/auctions?sortBy=featured&sortOrder=desc
```

### 3. Admin Operations

```javascript
// Toggle single auction featured status
PUT /api/admin/auctions/auction_id/featured
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "isFeatured": true
}

// Bulk update multiple auctions
PUT /api/admin/auctions/bulk-featured
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "auctionIds": ["id1", "id2", "id3"],
  "isFeatured": true
}
```

## Testing

### Running Tests
```bash
# Navigate to backend directory
cd backend

# Run the featured functionality test
node scripts/test-featured.js
```

### Test Coverage
The test script verifies:
1. Schema field existence
2. Auction creation with featured status
3. Filtering by featured status
4. Sorting by featured status
5. Updating featured status
6. Index performance

## Performance Considerations

### Database Indexes
- Compound index `{ isFeatured: 1, status: 1 }` optimizes common queries
- Single index `{ isFeatured: 1 }` for featured-only filtering

### Query Optimization
- Featured auctions are prioritized in sort order
- Efficient filtering prevents full table scans
- Pagination works seamlessly with featured filtering

## Security

### Authorization
- **User Level**: Can set featured status on their own auctions during creation/update
- **Admin Level**: Can toggle featured status on any auction
- **Bulk Operations**: Admin-only for security

### Validation
- Boolean validation for `isFeatured` field
- Proper error handling for invalid requests
- Audit logging for admin actions

## Future Enhancements

### Potential Features
1. **Featured Duration**: Time-limited featured status
2. **Featured Categories**: Different featured levels (premium, standard)
3. **Analytics**: Track featured auction performance
4. **Automated Featuring**: Algorithm-based featuring based on bid activity
5. **Featured Pricing**: Charge fees for featured placement

### API Extensions
1. **Featured Statistics**: Endpoint for featured auction metrics
2. **Featured History**: Track featuring history per auction
3. **Featured Limits**: Limit number of featured auctions per user

## Migration Notes

### Existing Data
- All existing auctions will have `isFeatured: false` by default
- No data migration required due to default value
- Indexes will be created automatically on first query

### Backward Compatibility
- API remains backward compatible
- Optional `isFeatured` parameter doesn't break existing clients
- Frontend gracefully handles missing `isFeatured` field

## Troubleshooting

### Common Issues
1. **Featured not showing**: Check if `isFeatured` is properly set in database
2. **Sorting not working**: Verify sort parameter is `sortBy=featured`
3. **Admin access denied**: Ensure user has admin role and proper token
4. **Performance issues**: Check if indexes are created properly

### Debug Commands
```javascript
// Check auction featured status
db.auctions.find({ isFeatured: true }).count()

// Verify indexes
db.auctions.getIndexes()

// Check specific auction
db.auctions.findOne({ _id: ObjectId("auction_id") })
``` 