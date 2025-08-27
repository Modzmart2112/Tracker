# Deploying Tracker Pro to Render

This guide will walk you through deploying your web scraping workflow system to Render.

## Prerequisites

- A Render account (free tier available)
- Your code pushed to a Git repository (GitHub, GitLab, etc.)

## Step 1: Prepare Your Repository

1. **Ensure all files are committed and pushed:**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Verify these files exist in your repo:**
   - `render.yaml` ✅
   - `package.json` ✅
   - `server/index.ts` ✅
   - `client/src/` ✅

## Step 2: Deploy to Render

### Option A: Using render.yaml (Recommended)

1. **Go to [render.com](https://render.com) and sign in**
2. **Click "New +" and select "Blueprint"**
3. **Connect your Git repository**
4. **Select the repository containing your code**
5. **Render will automatically detect the `render.yaml` file**
6. **Click "Apply" to deploy**

### Option B: Manual Deployment

1. **Go to [render.com](https://render.com) and sign in**
2. **Click "New +" and select "Web Service"**
3. **Connect your Git repository**
4. **Configure the service:**
   - **Name**: `tracker-pro`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Starter` (free tier)

## Step 3: Configure Environment Variables

Render will automatically set these:
- `NODE_ENV`: `production`
- `PORT`: `10000`
- `SESSION_SECRET`: Auto-generated
- `DATABASE_URL`: Auto-generated from PostgreSQL

## Step 4: Set Up PostgreSQL Database

1. **In your Render dashboard, click "New +" and select "PostgreSQL"**
2. **Configure:**
   - **Name**: `tracker-db`
   - **Database**: `tracker`
   - **User**: `tracker_user`
   - **Plan**: `Starter` (free tier)
3. **Copy the connection string**

## Step 5: Link Database to Web Service

1. **Go to your web service dashboard**
2. **Click "Environment" tab**
3. **Add environment variable:**
   - **Key**: `DATABASE_URL`
   - **Value**: Paste the PostgreSQL connection string

## Step 6: Deploy and Test

1. **Click "Manual Deploy" → "Deploy latest commit"**
2. **Wait for build to complete (usually 5-10 minutes)**
3. **Test your application at the provided URL**

## Step 7: Initialize Database

After first deployment, you'll need to set up your database schema:

1. **Go to your web service dashboard**
2. **Click "Shell" tab**
3. **Run the database setup:**
   ```bash
   npm run db:push
   ```

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Check that all dependencies are in `package.json`
   - Verify Node.js version compatibility
   - Check build logs for specific errors

2. **Database Connection Issues**
   - Verify `DATABASE_URL` is set correctly
   - Ensure PostgreSQL service is running
   - Check firewall settings

3. **Scraping Not Working**
   - Verify Puppeteer dependencies are installed
   - Check if headless mode is working
   - Review server logs for errors

### Performance Optimization

1. **Enable Auto-Scaling** (Paid plans only)
2. **Set up CDN** for static assets
3. **Configure connection pooling** for database
4. **Monitor resource usage** in Render dashboard

## Monitoring

- **Health Check**: `/health` endpoint
- **Logs**: Available in Render dashboard
- **Metrics**: Resource usage and performance data
- **Uptime**: Automatic monitoring and alerts

## Security Considerations

1. **Environment Variables**: Never commit secrets to Git
2. **Database Access**: Use Render's built-in security
3. **Rate Limiting**: Configure appropriate limits
4. **CORS**: Set to your domain in production

## Cost Optimization

- **Free Tier**: 750 hours/month, 512MB RAM
- **Starter Plan**: $7/month, 1GB RAM, better performance
- **Database**: Free tier includes 1GB storage

## Next Steps

After successful deployment:

1. **Set up custom domain** (optional)
2. **Configure SSL certificates** (automatic with Render)
3. **Set up monitoring and alerts**
4. **Configure backup strategies**
5. **Set up CI/CD pipeline**

## Support

- **Render Documentation**: [docs.render.com](https://docs.render.com)
- **Community**: [Render Community](https://community.render.com)
- **Status Page**: [status.render.com](https://status.render.com)

---

**Note**: The free tier has limitations. For production use, consider upgrading to a paid plan for better performance and reliability.
