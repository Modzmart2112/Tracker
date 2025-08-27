# Tracker Pro - Web Scraping Workflow System

A comprehensive web scraping workflow system designed for tracking competitor products, prices, and market changes. Built with Node.js, React, and PostgreSQL.

## Features

### 🚀 Core Functionality
- **Workflow Management**: Create and manage scraping workflows for different competitors and categories
- **Product Discovery**: Automatically discover product URLs from category pages with pagination support
- **Element Selection**: Visual element selector with live page preview and testing
- **Scheduled Scraping**: Automated daily scraping at configurable intervals (default: 12:00 AM)
- **Data Storage**: Efficient PostgreSQL database with structured data storage
- **Real-time Monitoring**: Track price changes, stock updates, and promotional offers

### 🎯 Key Capabilities
1. **Category URL Processing**: Input category URLs (e.g., `https://toolkitdepot.com.au/automotive/adjustable-wrenches/`)
2. **Product Discovery**: Automatically find all product page URLs with pagination support
3. **Element Selection**: Visual interface for selecting HTML elements to scrape
4. **Testing & Validation**: Test element selection on sample products before saving
5. **Automated Execution**: Daily scraping with configurable schedules
6. **Data Analytics**: Comprehensive dashboard for monitoring and analysis

### 🛠 Technical Stack
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Frontend**: React, TypeScript, Tailwind CSS
- **Scraping**: Puppeteer for headless browser automation
- **Scheduling**: Node-cron for automated task execution
- **UI Components**: Radix UI components with custom styling

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/tracker_db
   SESSION_SECRET=your-secret-key
   NODE_ENV=development
   PORT=3000
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Build and start production**
   ```bash
   npm run build
   npm start
   ```

## Usage Guide

### Creating a Scraping Workflow

1. **Navigate to Workflows Tab**
   - Click on the "Workflows" tab in the main navigation
   - Click "New Workflow" button

2. **Configure Basic Settings**
   - **Workflow Name**: Give your workflow a descriptive name
   - **Competitor Name**: Name of the competitor you're tracking
   - **Category URL**: The main category page URL to scrape
   - **Description**: Optional description of what this workflow tracks

3. **Discover Product URLs**
   - Click "Discover Product URLs" to automatically find all product pages
   - The system will crawl through pagination to find all products

4. **Select Scraping Elements**
   - Navigate to the "Elements" tab
   - Use the visual element selector to choose what data to scrape
   - Common elements: Title, Price, Description, Stock Status, Images

5. **Test and Save**
   - Test your element selection on sample products
   - Verify the scraped data looks correct
   - Save the configuration

6. **Schedule the Workflow**
   - Set up automated daily scraping (default: midnight)
   - Monitor the workflow status and results

### Element Selection

The system supports two types of selectors:

- **CSS Selectors**: Standard CSS selectors (e.g., `.product-title`, `#price`)
- **XPath**: XPath expressions for complex element selection

**Common Element Types:**
- **Title**: Product name and description
- **Price**: Current price, sale price, original price
- **Stock**: Availability status, quantity
- **Images**: Product photos, gallery images
- **Specifications**: Technical details, dimensions, materials

### Scheduling and Automation

- **Default Schedule**: Daily at 12:00 AM
- **Custom Schedules**: Use cron expressions for flexible timing
- **Manual Execution**: Run workflows on-demand for testing
- **Status Monitoring**: Track active/paused workflows

## API Endpoints

### Workflow Management
- `POST /api/workflows` - Create new workflow
- `GET /api/workflows` - List all workflows
- `GET /api/workflows/:id` - Get workflow details
- `DELETE /api/workflows/:id` - Delete workflow

### Product Discovery
- `POST /api/workflows/:id/discover-products` - Discover product URLs
- `GET /api/workflows/:id/products` - Get workflow products

### Element Management
- `POST /api/workflows/:id/elements` - Save scraping elements
- `POST /api/workflows/:id/test-elements` - Test element selection

### Execution Control
- `POST /api/workflows/:id/schedule` - Schedule workflow
- `POST /api/workflows/:id/pause` - Pause workflow
- `POST /api/workflows/:id/resume` - Resume workflow
- `POST /api/workflows/:id/run` - Run workflow manually

### Data Access
- `GET /api/workflows/:id/results` - Get scraping results
- `GET /api/preview-page` - Preview page for element selection

## Database Schema

### Core Tables
- **scraping_workflows**: Main workflow configuration
- **scraping_elements**: Element definitions for each workflow
- **product_urls**: Product URLs discovered for each workflow
- **scraping_results**: Historical scraping data
- **scheduled_tasks**: Automation scheduling information

### Data Relationships
```
workflow → elements (1:many)
workflow → product_urls (1:many)
workflow → results (1:many)
workflow → scheduled_task (1:1)
```

## Configuration

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3000)

### Database Configuration
- **Connection Pool**: Configurable connection limits
- **SSL**: Optional SSL for production databases
- **Migrations**: Automatic schema updates with Drizzle

### Scraping Configuration
- **Headless Mode**: Configurable browser visibility
- **Timeout Settings**: Page load and element wait times
- **Retry Logic**: Automatic retry for failed requests
- **Rate Limiting**: Configurable delays between requests

## Monitoring and Maintenance

### System Health
- Health check endpoint: `/health`
- Database connection monitoring
- Scheduled task status tracking

### Logging
- Request/response logging
- Error tracking and reporting
- Performance metrics

### Data Management
- Automatic cleanup of old results
- Data retention policies
- Backup and recovery procedures

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify PostgreSQL is running
   - Check connection string in `.env`
   - Ensure database exists and is accessible

2. **Scraping Failures**
   - Check if target website is accessible
   - Verify element selectors are still valid
   - Review browser console for JavaScript errors

3. **Performance Issues**
   - Monitor database query performance
   - Check for memory leaks in long-running scrapes
   - Optimize element selection strategies

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` and check console output for detailed information.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation and troubleshooting guide
- Review the API documentation for technical details

## Roadmap

### Upcoming Features
- **Advanced Analytics**: Price trend analysis and forecasting
- **Alert System**: Notifications for significant price changes
- **API Integration**: Webhook support for external systems
- **Mobile App**: React Native mobile application
- **Machine Learning**: Automated element detection and validation

### Performance Improvements
- **Parallel Scraping**: Multi-threaded execution
- **Caching**: Redis integration for improved performance
- **CDN Integration**: Static asset optimization
- **Database Optimization**: Query optimization and indexing

---

**Note**: This system is designed for ethical web scraping. Please ensure compliance with target websites' terms of service and robots.txt files. Respect rate limits and implement appropriate delays between requests.
