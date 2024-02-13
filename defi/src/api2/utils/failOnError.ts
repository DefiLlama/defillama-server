
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception thrown', error);
  process.exit(1);
})