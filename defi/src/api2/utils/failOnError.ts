
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Global] Unhandled Rejection at:', promise, 'reason:', reason);
  // process.exit(1);
})

process.on('uncaughtException', (error) => {
  console.error('[Global] Uncaught Exception thrown', error);
  // process.exit(1);
})