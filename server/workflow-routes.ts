import express from 'express';
import { WorkflowScraper } from './workflow-scraper';
import { WorkflowScheduler } from './workflow-scheduler';
import { db } from './db';
import { scrapingWorkflows, scrapingElements, productUrls, scrapingResults, scheduledTasks } from './storage.drizzle';
import { eq, and, desc } from 'drizzle-orm';

const router = express.Router();
const scraper = new WorkflowScraper();
const scheduler = new WorkflowScheduler();

// Initialize scraper and scheduler
scraper.initialize().then(() => {
  console.log('Workflow scraper initialized');
});

scheduler.initialize().then(() => {
  console.log('Workflow scheduler initialized');
});

// Create a new scraping workflow
router.post('/workflows', async (req, res) => {
  try {
    const { name, description, categoryUrl, competitorName, userId } = req.body;
    
    if (!name || !categoryUrl || !competitorName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const workflowId = await scraper.createWorkflow(name, description, categoryUrl, competitorName, userId);
    
    res.json({ success: true, workflowId });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// Discover product URLs from a category page
router.post('/workflows/:workflowId/discover-products', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const workflow = await db.select()
      .from(scrapingWorkflows)
      .where(eq(scrapingWorkflows.id, parseInt(workflowId)))
      .limit(1);

    if (workflow.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const productUrls = await scraper.discoverProductUrls(workflow[0].categoryUrl);
    
    // Store the discovered URLs
    await scraper.addProductUrls(parseInt(workflowId), productUrls);
    
    res.json({ success: true, productUrls, count: productUrls.length });
  } catch (error) {
    console.error('Error discovering products:', error);
    res.status(500).json({ error: 'Failed to discover products' });
  }
});

// Preview a page for element selection
router.post('/preview-page', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const { html, screenshot } = await scraper.previewPage(url);
    
    res.json({
      success: true,
      html,
      screenshot: screenshot.toString('base64')
    });
  } catch (error) {
    console.error('Error previewing page:', error);
    res.status(500).json({ error: 'Failed to preview page' });
  }
});

// Test element selection on a sample product
router.post('/workflows/:workflowId/test-elements', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { elements, testUrl } = req.body;
    
    if (!elements || !testUrl) {
      return res.status(400).json({ error: 'Elements and test URL are required' });
    }

    console.log(`Testing elements for workflow ${workflowId} on URL: ${testUrl}`);
    console.log('Elements to test:', elements);

    const rawResults = await scraper.testElementSelection(testUrl, elements);
    
    // Transform results to match the expected format
    const results = Object.entries(rawResults).map(([elementName, value]) => ({
      elementName,
      selector: elements.find(el => el.name === elementName)?.selector || 'Unknown',
      extractedValue: value || 'No value found',
      success: value && value !== 'Element not found' && !value.toString().startsWith('Error:'),
      error: value && value.toString().startsWith('Error:') ? value.toString() : undefined
    }));

    console.log('Test results:', results);
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error testing elements:', error);
    res.status(500).json({ error: 'Failed to test elements' });
  }
});

// Save scraping elements for a workflow
router.post('/workflows/:workflowId/elements', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { elements } = req.body;
    
    if (!elements || !Array.isArray(elements)) {
      return res.status(400).json({ error: 'Elements array is required' });
    }

    await scraper.addScrapingElements(parseInt(workflowId), elements);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving elements:', error);
    res.status(500).json({ error: 'Failed to save elements' });
  }
});

// Schedule a workflow
router.post('/workflows/:workflowId/schedule', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { cronExpression } = req.body;
    
    await scheduler.scheduleWorkflow(parseInt(workflowId), cronExpression);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error scheduling workflow:', error);
    res.status(500).json({ error: 'Failed to schedule workflow' });
  }
});

// Pause a workflow
router.post('/workflows/:workflowId/pause', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    await scheduler.pauseWorkflow(parseInt(workflowId));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error pausing workflow:', error);
    res.status(500).json({ error: 'Failed to pause workflow' });
  }
});

// Resume a workflow
router.post('/workflows/:workflowId/resume', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    await scheduler.resumeWorkflow(parseInt(workflowId));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error resuming workflow:', error);
    res.status(500).json({ error: 'Failed to resume workflow' });
  }
});

// Run a workflow manually
router.post('/workflows/:workflowId/run', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    await scheduler.runWorkflow(parseInt(workflowId));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error running workflow:', error);
    res.status(500).json({ error: 'Failed to run workflow' });
  }
});

// Get all workflows
router.get('/workflows', async (req, res) => {
  try {
    const workflows = await db.select()
      .from(scrapingWorkflows)
      .orderBy(desc(scrapingWorkflows.createdAt));
    
    res.json({ success: true, workflows });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// Get workflow details
router.get('/workflows/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    const workflow = await db.select()
      .from(scrapingWorkflows)
      .where(eq(scrapingWorkflows.id, parseInt(workflowId)))
      .limit(1);

    if (workflow.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const elements = await db.select()
      .from(scrapingElements)
      .where(eq(scrapingElements.workflowId, parseInt(workflowId)))
      .orderBy(scrapingElements.order);

    const productUrls = await db.select()
      .from(productUrls)
      .where(eq(productUrls.workflowId, parseInt(workflowId)));

    const scheduledTask = await db.select()
      .from(scheduledTasks)
      .where(eq(scheduledTasks.workflowId, parseInt(workflowId)))
      .limit(1);

    res.json({
      success: true,
      workflow: workflow[0],
      elements,
      productUrls,
      scheduledTask: scheduledTask[0] || null
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

// Get scraping results for a workflow
router.get('/workflows/:workflowId/results', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    const results = await db.select()
      .from(scrapingResults)
      .where(eq(scrapingResults.workflowId, parseInt(workflowId)))
      .orderBy(desc(scrapingResults.scrapedAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const total = await db.select({ count: scrapingResults.id })
      .from(scrapingResults)
      .where(eq(scrapingResults.workflowId, parseInt(workflowId)));

    res.json({
      success: true,
      results,
      total: total[0]?.count || 0
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Delete a workflow
router.delete('/workflows/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    // Pause the workflow first
    await scheduler.pauseWorkflow(parseInt(workflowId));
    
    // Delete related records
    await db.delete(scrapingResults).where(eq(scrapingResults.workflowId, parseInt(workflowId)));
    await db.delete(productUrls).where(eq(productUrls.workflowId, parseInt(workflowId)));
    await db.delete(scrapingElements).where(eq(scrapingElements.workflowId, parseInt(workflowId)));
    await db.delete(scheduledTasks).where(eq(scheduledTasks.workflowId, parseInt(workflowId)));
    await db.delete(scrapingWorkflows).where(eq(scrapingWorkflows.id, parseInt(workflowId)));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

export default router;
