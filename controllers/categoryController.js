const Category = require('../models/Category');
const Auction = require('../models/Auction');

// Get all categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 });

    // Get auction counts separately
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const auctionCount = await Auction.countDocuments({ categoryId: category._id });
        return {
          ...category.toObject(),
          auctionCount,
          id: category._id // Add id field for frontend compatibility
        };
      })
    );

    res.json({
      success: true,
      data: { categories: categoriesWithCounts }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};

// Get category by ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get auction count separately
    const auctionCount = await Auction.countDocuments({ categoryId: id });

    res.json({
      success: true,
      data: { 
        category: {
          ...category.toObject(),
          auctionCount,
          id: category._id
        }
      }
    });

  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category'
    });
  }
};

// Create category
const createCategory = async (req, res) => {
  try {
    const { name, description, slug, icon } = req.body;

    // Check if category with this slug already exists
    const existingCategory = await Category.findOne({ slug });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this slug already exists'
      });
    }

    const category = new Category({
      name,
      description,
      slug,
      icon
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { 
        category: {
          ...category.toObject(),
          id: category._id
        }
      }
    });

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category'
    });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, slug, icon, isActive } = req.body;

    // Check if category exists
    const existingCategory = await Category.findById(id);

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if slug is being changed and if it conflicts
    if (slug && slug !== existingCategory.slug) {
      const slugConflict = await Category.findOne({ slug });

      if (slugConflict) {
        return res.status(400).json({
          success: false,
          message: 'Category with this slug already exists'
        });
      }
    }

    // Update category
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (slug) updateData.slug = slug;
    if (icon) updateData.icon = icon;
    if (isActive !== undefined) updateData.isActive = isActive;

    const category = await Category.findByIdAndUpdate(id, updateData, { new: true });

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { 
        category: {
          ...category.toObject(),
          id: category._id
        }
      }
    });

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category'
    });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const existingCategory = await Category.findById(id);

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has auctions
    const auctionCount = await Auction.countDocuments({ categoryId: id });

    if (auctionCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with existing auctions. Please move auctions to another category first.'
      });
    }

    await Category.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category'
    });
  }
};

// Create default categories (helper function)
const createDefaultCategories = async () => {
  const defaultCategories = [
    {
      name: 'Electronics',
      description: 'Electronics and gadgets',
      slug: 'electronics',
      icon: 'fas fa-laptop'
    },
    {
      name: 'Vehicles',
      description: 'Cars, bikes, and other vehicles',
      slug: 'vehicles',
      icon: 'fas fa-car'
    },
    {
      name: 'Fashion',
      description: 'Clothing, accessories, and fashion items',
      slug: 'fashion',
      icon: 'fas fa-tshirt'
    },
    {
      name: 'Home & Garden',
      description: 'Home appliances and garden items',
      slug: 'home-garden',
      icon: 'fas fa-home'
    },
    {
      name: 'Sports',
      description: 'Sports equipment and fitness items',
      slug: 'sports',
      icon: 'fas fa-football-ball'
    },
    {
      name: 'Art & Collectibles',
      description: 'Artwork, antiques, and collectible items',
      slug: 'art-collectibles',
      icon: 'fas fa-palette'
    },
    {
      name: 'Books & Media',
      description: 'Books, movies, music, and other media',
      slug: 'books-media',
      icon: 'fas fa-book'
    },
    {
      name: 'Jewelry',
      description: 'Jewelry and precious items',
      slug: 'jewelry',
      icon: 'fas fa-gem'
    }
  ];

  try {
    for (const category of defaultCategories) {
      try {
        // Check if category already exists
        const existing = await Category.findOne({ slug: category.slug });

        if (!existing) {
          const newCategory = new Category(category);
          await newCategory.save();
          console.log(`✅ Created category: ${category.name}`);
        }
      } catch (error) {
        // Skip if category already exists (duplicate key error)
        if (error.code === 11000) {
          console.log(`⚠️ Category already exists: ${category.name}`);
        } else {
          console.error(`❌ Error creating category ${category.name}:`, error);
        }
      }
    }
    console.log('✅ Default categories initialization complete');
  } catch (error) {
    console.error('❌ Error initializing default categories:', error);
  }
};

// Initialize default categories (admin endpoint)
const initializeDefaultCategories = async (req, res) => {
  try {
    await createDefaultCategories();
    res.json({
      success: true,
      message: 'Default categories initialized successfully'
    });
  } catch (error) {
    console.error('Initialize categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize default categories'
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  initializeDefaultCategories,
  createDefaultCategories
}; 