// Performance monitoring utility
export const performanceMonitor = {
  timers: new Map(),
  
  start(label) {
    this.timers.set(label, process.hrtime.bigint());
  },
  
  end(label) {
    const startTime = this.timers.get(label);
    if (!startTime) {
      console.warn(`Timer '${label}' not found`);
      return;
    }
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    this.timers.delete(label);
    
    console.log(`⏱️  ${label}: ${duration.toFixed(2)}ms`);
    return duration;
  },
  
  async measure(label, fn) {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }
};

// Middleware to track request performance
export const performanceMiddleware = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000;
    
    console.log(`🚀 ${req.method} ${req.path}: ${duration.toFixed(2)}ms - ${res.statusCode}`);
  });
  
  next();
};
