export type ProfilerData = {
  [key: string]: {
    totalTime: number;
    averageTime: number;
    count: number;
  };
};

export class Profiler {
  protected data: ProfilerData = {};

  addDataPoint(key: string, time: number): void {
    this.data[key] = this.data[key] || {
      totalTime: 0,
      averageTime: 0,
      count: 0,
    };

    this.data[key].totalTime += time;
    this.data[key].averageTime =
      (this.data[key].averageTime * this.data[key].count + time) / (this.data[key].count + 1);
    this.data[key].count += 1;
  }

  getData(): ProfilerData {
    return this.data;
  }
}
