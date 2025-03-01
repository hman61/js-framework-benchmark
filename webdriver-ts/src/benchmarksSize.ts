import * as benchmarksCommon from "./benchmarksCommon.js";
import { BenchmarkImpl, BenchmarkType, SizeBenchmarkInfo } from "./benchmarksCommon.js";

export interface SizeBenchmarkResult {
  benchmark: SizeBenchmarkInfo;
  result: number;
}

let id = (x: number) => x;
let toKb = (x: number) => x / 1024;

export const benchUncompressedSize: benchmarksCommon.SizeBenchmarkInfo = {
  id: "41_size-uncompressed",
  label: "uncompressed size",
  description: () =>
    "uncompressed size of all implementation files (excluding /css and http headers)",
  type: BenchmarkType.SIZE,
  fn: (sizeInfo) => toKb(sizeInfo.size_uncompressed),
};

export const benchCompressedSize: benchmarksCommon.SizeBenchmarkInfo = {
  id: "42_size-compressed",
  label: "compressed size",
  description: () =>
    "brotli compressed size of all implementation files (excluding /css and http headers)",
  type: BenchmarkType.SIZE,
  fn: (sizeInfo) => toKb(sizeInfo.size_compressed),
};

export const subbenchmarks = [
  benchUncompressedSize,
  benchCompressedSize,
];

export class BenchmarkSize implements BenchmarkImpl {
  type = BenchmarkType.SIZE_MAIN;
  benchmarkInfo = benchmarksCommon.sizeBenchmarkInfos[benchmarksCommon.Benchmark._40];
  subbenchmarks = subbenchmarks;
}

export const benchSize = new BenchmarkSize();

export const benchmarks = [benchSize];
