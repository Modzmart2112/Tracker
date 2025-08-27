import cron from 'node-cron';
import { DrizzleStorage } from './storage.drizzle';
import { WorkflowScraper } from './workflow-scraper';

export class WorkflowScheduler {
  private scraper: WorkflowScraper;
  private scheduledJobs: Map<number, cron.ScheduledTask> = new Map();
  private storage: DrizzleStorage;

  constructor() {
    this.scraper = new WorkflowScraper();
    this.storage = new DrizzleStorage();
  }

  async initialize(): Promise<void> {
    await this.scraper.initialize();
    await this.loadScheduledTasks();
  }

  async loadScheduledTasks(): Promise<void> {
    const tasks = await this.storage.getScheduledTasks();
    const activeTasks = tasks.filter(task => task.isActive);
    
    for (const task of activeTasks) {
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
        await this.storage.updateScheduledTask(task.id, {
          lastRun: new Date(),
          nextRun: nextRun
        });
          
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
      const workflows = await this.storage.getScrapingWorkflows();
      const workflow = workflows.find(w => w.id === workflowId);

      if (!workflow || !workflow.isActive) {
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
    const tasks = await this.storage.getScheduledTasks();
    const existingTask = tasks.find(t => t.workflowId === workflowId);

    if (existingTask) {
      // Update existing task
      const updatedTask = await this.storage.updateScheduledTask(existingTask.id, {
        cronExpression,
        isActive: true,
        nextRun: this.calculateNextRun(cronExpression),
        updatedAt: new Date()
      });
        
      // Reschedule the job
      this.scheduleTask({ ...existingTask, cronExpression });
    } else {
      // Create new task
      const newTask = await this.storage.createScheduledTask({
        workflowId,
        cronExpression,
        isActive: true,
        nextRun: this.calculateNextRun(cronExpression)
      });

      this.scheduleTask(newTask);
    }
  }

  async pauseWorkflow(workflowId: string): Promise<void> {
    await this.storage.updateScheduledTask(workflowId, { 
      isActive: false, 
      updatedAt: new Date() 
    });

    // Stop the scheduled job
    const tasks = await this.storage.getScheduledTasks();
    const task = tasks.find(t => t.workflowId === workflowId);

    if (task && this.scheduledJobs.has(task.id)) {
      this.scheduledJobs.get(task.id)?.stop();
      this.scheduledJobs.delete(task.id);
    }
  }

  async resumeWorkflow(workflowId: string): Promise<void> {
    await this.storage.updateScheduledTask(workflowId, { 
      isActive: true, 
      updatedAt: new Date() 
    });

    // Reload the task
    const tasks = await this.storage.getScheduledTasks();
    const task = tasks.find(t => t.workflowId === workflowId);

    if (task) {
      this.scheduleTask(task);
    }
  }

  async runAllActiveWorkflows(): Promise<void> {
    const workflows = await this.storage.getScrapingWorkflows();
    const activeWorkflows = workflows.filter(w => w.isActive);

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
