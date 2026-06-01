import { prisma } from '../prisma.js';

export async function runSchedulerJob() {
  console.log('[Scheduler Cron] Running approved comments scheduler check...');
  try {
    // Find comments that are marked as 'approved' (meaning the user approved them, but they haven't been scheduled yet)
    const approvedComments = await prisma.workflowComment.findMany({
      where: { status: 'approved' },
      include: { workflow: true }
    });

    if (approvedComments.length === 0) return;

    console.log(`[Scheduler Cron] Found ${approvedComments.length} approved comments to schedule.`);

    for (const comment of approvedComments) {
      // Calculate a random time between 9 AM and 9 PM IST
      const scheduledTime = getScheduledTimeInIST();
      
      await prisma.workflowComment.update({
        where: { id: comment.id },
        data: {
          status: 'scheduled',
          scheduledAt: scheduledTime
        }
      });

      console.log(`[Scheduler Cron] Comment ${comment.id} successfully scheduled for ${scheduledTime.toISOString()} (UTC) / IST target.`);
    }
  } catch (err) {
    console.error('[Scheduler Cron Error]', err);
  }
}

/**
 * Calculates a random scheduled time between 9 AM and 9 PM IST (UTC+5:30).
 * If the current time is already past 9 PM IST, it schedules for tomorrow.
 * Otherwise, it schedules for a random time today between the current time (+ 5 mins) and 9 PM IST.
 */
function getScheduledTimeInIST() {
  const now = new Date();
  
  // IST offset is +5.5 hours (330 minutes)
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(now.getTime() + istOffsetMs);
  
  const currentYear = nowIST.getUTCFullYear();
  const currentMonth = nowIST.getUTCMonth();
  const currentDay = nowIST.getUTCDate();
  const currentHour = nowIST.getUTCHours();
  const currentMinute = nowIST.getUTCMinutes();

  let targetDateIST;
  
  const currentMinutesSinceMidnight = currentHour * 60 + currentMinute;
  const endMinutesSinceMidnight = 21 * 60; // 9:00 PM IST = 1260 minutes
  
  // We want to schedule at least 5 minutes in the future to allow processing
  const minScheduledMinutes = currentMinutesSinceMidnight + 5;

  if (currentHour >= 21 || minScheduledMinutes >= endMinutesSinceMidnight) {
    // Past 9 PM IST (or less than 5 minutes remaining today). Schedule for tomorrow.
    const tomorrowIST = new Date(Date.UTC(currentYear, currentMonth, currentDay + 1));
    const randomHour = 9 + Math.floor(Math.random() * 12); // 9 to 20 (9 AM to 8:59 PM)
    const randomMinute = Math.floor(Math.random() * 60);
    tomorrowIST.setUTCHours(randomHour, randomMinute, 0, 0);
    targetDateIST = tomorrowIST;
  } else {
    // There is still time left today!
    let targetHour, targetMinute;
    
    if (currentHour < 9) {
      // It is before 9 AM today. Choose any random time between 9 AM and 9 PM today.
      targetHour = 9 + Math.floor(Math.random() * 12); // 9 to 20
      targetMinute = Math.floor(Math.random() * 60);
    } else {
      // It is between 9 AM and 9 PM today.
      // Pick a random minute between minScheduledMinutes and endMinutesSinceMidnight.
      const range = endMinutesSinceMidnight - minScheduledMinutes;
      const randomOffset = Math.floor(Math.random() * range);
      const scheduledMinutes = minScheduledMinutes + randomOffset;
      
      targetHour = Math.floor(scheduledMinutes / 60);
      targetMinute = scheduledMinutes % 60;
    }
    
    targetDateIST = new Date(Date.UTC(currentYear, currentMonth, currentDay, targetHour, targetMinute, 0, 0));
  }

  // Convert the IST date back to UTC for saving in the database
  const targetUTC = new Date(targetDateIST.getTime() - istOffsetMs);
  return targetUTC;
}
