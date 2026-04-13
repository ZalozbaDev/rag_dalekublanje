import { tool } from '@langchain/core/tools';
import { z } from 'zod';

function dateTime() {
  const options = { timeZone: 'Europe/Berlin', hour12: false };
  const date = new Date();
  const dateString = date.toLocaleString('de-DE', options);
  const dayOfWeek = date.toLocaleDateString('de-DE', {
    weekday: 'long',
    timeZone: 'Europe/Berlin',
  });

  return `${dayOfWeek}, ${dateString}`;
}

const dateTimeSchema = z.object({})
.describe('Returns the current date and time as string.');

export const dateTimeTool = tool(dateTime, {
    name: 'dateTimeTool',
    description: 'Returns the current date and time in the Europe/Berline timezone.',
    schema: dateTimeSchema
});
