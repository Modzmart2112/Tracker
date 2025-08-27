import cron from 'node-cron';
import { db } from './db';
import { scrapingWorkflows, scheduledTasks, scrapingResults, productUrls } from './storage.drizzle';
import { eq, and, lt } from 'drizzle-orm';
import { WorkflowScraper } from './workflow-scraper';

export class WorkflowScheduler {
  private scraper: WorkflowScraper;
  private scheduledJobs: Map<number, cron.ScheduledTask> = new Map();

  constructor() {
    this.scraper = new WorkflowScraper();
  }

  async initialize(): Promise<void> {
    await this.scraper.initialize();
    await this.loadScheduledTasks();
  }

  async loadScheduledTasks(): Promise<void> {
    const tasks = await db.select().from(scheduledTasks).where(eq(scheduledTasks.isActive, true));
    
    for (const task of tasks) {
      this.scheduleTask(task);
    }
  }

  private scheduleTask(task: any): void {
    // Cancel existing job if any
    if (this.scheduledJobs.has(task.id)) {
      this.scheduledJobs.get(task.id)?.stop();
    }

    // Schedule new job
    const job = cron.schedule(task.cronExpression, async () => {
      try {
        console.log(`Running scheduled task for workflow ${task.workflowId}`);
        await this.runWorkflow(task.workflowId);
        
        // Update last run and next run
        const nextRun = this.calculateNextRun(task.cronExpression);
        await db.update(scheduledTasks)
          .set({ 
            lastRun: new Date(),
            nextRun: nextRun
          })
          .where(eq(scheduledTasks.id, task.id));
          
      } catch (error) {
        console.error(`Error running scheduled task ${task.id}:`, error);
      }
    }, {
      scheduled: false
    });

    this.scheduledJobs.set(task.id, job);
    job.start();
  }

  private calculateNextRun(cronExpression: string): Date {
    const now = new Date();
    const nextRun = cron.getNextDate(cronExpression, now);
    return nextRun;
  }

  async runWorkflow(workflowId: string): Promise<void> {
    try {
      // Check if workflow is active
      const workflow = await db.select()
        .from(scrapingWorkflows)
        .where(eq(scrapingWorkflows.id, workflowId))
        .limit(1);

      if (workflow.length === 0 || !workflow[0].isActive) {
        console.log(`Workflow ${workflowId} is not active or not found`);
        return;
      }

      // Run the scraper
      await this.scraper.scrapeProducts(workflowId);
      
      console.log(`Successfully completed workflow ${workflowId}`);
      
    } catch (error) {
      console.error(`Error running workflow ${workflowId}:`, error);
      throw error;
    }
  }

  async scheduleWorkflow(workflowId: string, cronExpression: string = '0 0 * * *'): Promise<void> {
    // Check if task already exists
    const existingTask = await db.select()
      .from(scheduledTasks)
      .where(eq(scheduledTasks.workflowId, workflowId))
      .limit(1);

    if (existingTask.length > 0) {
      // Update existing task
      await db.update(scheduledTasks)
        .set({ 
          cronExpression,
          isActive: true,
          nextRun: this.calculateNextRun(cronExpression),
          updatedAt: new Date()
        })
        .where(eq(scheduledTasks.id, existingTask[0].id));
        
      // Reschedule the job
      this.scheduleTask({ ...existingTask[0], cronExpression });
    } else {
      // Create new task
      const [newTask] = await db.insert(scheduledTasks).values({
        workflowId,
        cronExpression,
        isActive: true,
        nextRun: this.calculateNextRun(cronExpression)
      }).returning();

      this.scheduleTask(newTask);
    }
  }

  async pauseWorkflow(workflowId: string): Promise<void> {
    await db.update(scheduledTasks)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(scheduledTasks.workflowId, workflowId));

    // Stop the scheduled job
    const task = await db.select()
      .from(scheduledTasks)
      .where(eq(scheduledTasks.workflowId, workflowId))
      .limit(1);

    if (task.length > 0 && this.scheduledJobs.has(task[0].id)) {
      this.scheduledJobs.get(task[0].id)?.stop();
      this.scheduledJobs.delete(task[0].id);
    }
  }

  async resumeWorkflow(workflowId: string): Promise<void> {
    await db.update(scheduledTasks)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(scheduledTasks.workflowId, workflowId));

    // Reload the task
    const task = await db.select()
      .from(scheduledTasks)
      .where(eq(scheduledTasks.workflowId, workflowId))
      .limit(1);

    if (task.length > 0) {
      this.scheduleTask(task[0]);
    }
  }

  async runAllActiveWorkflows(): Promise<void> {
    const activeWorkflows = await db.select()
      .from(scrapingWorkflows)
      .where(eq(scrapingWorkflows.isActive, true));

    for (const workflow of activeWorkflows) {
      try {
        await this.runWorkflow(workflow.id);
      } catch (error) {
        console.error(`Error running workflow ${workflow.id}:`, error);
      }
    }
  }

  async cleanup(): Promise<void> {
    // Stop all scheduled jobs
    for (const job of this.scheduledJobs.values()) {
      job.stop();
    }
    this.scheduledJobs.clear();
    
    // Close scraper
    await this.scraper.close();
  }

  getScheduledJobs(): Map<number, cron.ScheduledTask> {
    return this.scheduledJobs;
  }
}
