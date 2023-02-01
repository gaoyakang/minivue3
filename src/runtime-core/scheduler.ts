const queue: any[] = [];

let isFlushPending = false;
let p = Promise.resolve();

export function nextTick(fn) {
  return fn ? p.then(fn) : p;
}

export function queueJobs(job) {
  //收集同步任务
  if (!queue.includes(job)) {
    queue.push(job);
  }
  // 异步执行收集好的任务
  queueFlush();
}

function queueFlush() {
  if (isFlushPending) return;
  isFlushPending = true;
  nextTick(flushJobs);
}

function flushJobs() {
  isFlushPending = false;
  let job;
  while ((job = queue.shift())) {
    job && job();
  }
}
