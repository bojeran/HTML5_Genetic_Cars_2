# test-project

## Description
Start local server and open the genetic cars simulation in browser

## Instructions
1. Check if the Python HTTP Server on port 8000 is already running. If yes we can skip to step 3 and just reload the page.
2. Start a Python HTTP server on port 8000 in the background (use & and nohup to run the server as a daemon)
3. Wait a moment for the server to start
4. Navigate to http://localhost:8000 using Puppeteer
5. Use puppeteer_evaluate to capture console logs from the page. For this use getGameLogs.logHistoryString(200). So at least 200 lines of log is used as context. Also wait a while (20 - 30 seconds) before getting the logs to allow the simulation to proceed to some extent.
6. Evaluate the logs from getGameLogs if there are any issues

**Note:** Yes, Puppeteer can read console logs using the evaluate function to inject JavaScript that captures console output.