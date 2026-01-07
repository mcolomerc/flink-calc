import { defineStore } from 'pinia';

export const useEnvironmentStore = defineStore('environment', {
  state: () => ({
    slotsPerTM: 4,
    coresPerTM: 4,
    tmProcessMemoryGiB: 16,
    jmProcessMemoryGiB: 4,
    stateBackend: 'rocksdb',
    checkpointIntervalSec: 300,
    maxCheckpointDurationSec: 120,
    javaVersion: '17',
    flinkVersion: '1.20',
    useEfficiencyAdjustments: true,
    recordWireSizeBytes: 1000,
    recordLogicalSizeBytes: 1000,
    recordFormat: 'avro',
    compressionCodec: 'none',
    // FLIP-49 configuration
    useFlip49: false,
    deploymentType: 'standalone', // 'standalone', 'kubernetes', 'docker', 'yarn'
    flip49NetworkFraction: 0.1,
    flip49ManagedFraction: 0.4,
    flip49OverheadFraction: 0.1,
    flip49NetworkMemoryMin: 64, // MiB
    flip49NetworkMemoryMax: 1024, // MiB
    flip49OverheadMemoryMin: 192, // MiB
    flip49OverheadMemoryMax: 768, // MiB
    flip49MetaspaceSize: 96, // MiB
    flip49DirectMemoryCap: 512, // MiB
    flip49HeapCutoffMin: 1024, // MiB
    flip49HeapCutoffRatio: 0.8,
    // Checkpoint I/O configuration
    checkpointStorageBackend: 's3', // 's3', 'hdfs', 'nfs', 'local', 'disk'
    checkpointDeployment: 'aws', // 'aws', 'other' for S3 timing
    checkpointIOThroughputMBps: null, // null = auto-detect based on backend
    // Source constraints and skew modeling
    maxSourceParallelism: null, // null = unlimited, or number for Kafka partitions constraint
    enableSkewModeling: false, // enable advanced skew modeling
    skewFactor: 1.0, // p95 hot key share (1.0 = no skew, 2.0 = 2x skew)
    keyByMultiplier: 0.8, // legacy flat keyBy penalty (kept for compatibility)
    // RocksDB state overhead modeling
    enableRocksdbOverheadModeling: false, // enable detailed RocksDB overhead modeling
    rocksdbIndexMultiplier: 1.2, // index overhead (1.2 = 20% overhead)
    rocksdbCompactionMultiplier: 1.3, // compaction amplification (1.3 = 30% overhead)
    rocksdbMetadataMultiplier: 1.1, // metadata overhead (1.1 = 10% overhead)
    rocksdbBlockSizeKB: 4, // block size for index calculations
    rocksdbCompressionType: 'snappy' // compression type affecting overhead
  }),
  
  getters: {
    javaMultiplier: (state) => {
      if (!state.useEfficiencyAdjustments) return 1.0;
      const multipliers = {
        '11': 1.00,
        '17': 1.05,
        '21': 1.06
      };
      return multipliers[state.javaVersion] || 1.00;
    },
    
    flinkMultiplier: (state) => {
      if (!state.useEfficiencyAdjustments) return 1.0;
      const version = parseFloat(state.flinkVersion);
      if (version >= 2.0) return 1.10;
      if (version >= 1.20) return 1.08;
      if (version >= 1.17) return 1.05;
      return 1.00;
    },
    
    combinedEfficiencyMultiplier: (state) => {
      return state.javaMultiplier * state.flinkMultiplier;
    },
    
    efficiencyDescription: (state) => {
      if (!state.useEfficiencyAdjustments) return 'No efficiency adjustments applied';
      const javaGain = ((state.javaMultiplier - 1) * 100).toFixed(0);
      const flinkGain = ((state.flinkMultiplier - 1) * 100).toFixed(0);
      const totalGain = ((state.combinedEfficiencyMultiplier - 1) * 100).toFixed(0);
      return `Java ${state.javaVersion}: +${javaGain}%, Flink ${state.flinkVersion}: +${flinkGain}% → Total: +${totalGain}% capacity improvement`;
    },
    
    formatMultiplier: (state) => {
      const multipliers = {
        json: 0.6,
        avro: 1.0,
        protobuf: 1.05,
        binary: 1.15
      };
      return multipliers[state.recordFormat] || 1.0;
    },
    
    sizePenalty: (state) => {
      const bytes = state.recordWireSizeBytes;
      if (bytes <= 1024) return 1.0;
      if (bytes <= 10 * 1024) return 0.85;
      if (bytes <= 100 * 1024) return 0.65;
      return 0.5;
    },
    
    formatDescription: (state) => {
      const mult = state.formatMultiplier;
      const penalty = state.sizePenalty;
      const combined = ((mult * penalty - 1) * 100).toFixed(0);
      const direction = combined >= 0 ? '+' : '';
      return `Format (${state.recordFormat}): ${mult}x | Size penalty: ${penalty}x | Combined impact: ${direction}${combined}%`;
    },
    
    // Advanced skew modeling
    effectiveKeyByMultiplier: (state) => {
      if (!state.enableSkewModeling) {
        return state.keyByMultiplier; // Use legacy flat penalty
      }
      
      // Advanced skew modeling: combine base penalty with skew factor
      // skewFactor represents p95 hot key share (e.g., 2.0 = 2x skew)
      const basePenalty = state.keyByMultiplier;
      const skewPenalty = Math.max(1.0, state.skewFactor / 1.5); // Normalize skew impact
      return basePenalty * skewPenalty;
    },
    
    skewDescription: (state) => {
      if (!state.enableSkewModeling) {
        return `Legacy keyBy penalty: ${state.keyByMultiplier}x`;
      }
      
      const effective = state.effectiveKeyByMultiplier;
      const skewImpact = (effective / state.keyByMultiplier).toFixed(2);
      return `Skew modeling enabled: base ${state.keyByMultiplier}x × skew ${skewImpact}x = ${effective.toFixed(2)}x effective penalty`;
    },
    
    sourceConstraintDescription: (state) => {
      if (state.maxSourceParallelism === null) {
        return 'No source parallelism constraint';
      }
      return `Source parallelism capped at ${state.maxSourceParallelism} (e.g., Kafka partitions)`;
    },
    
    // RocksDB overhead modeling
    rocksdbTotalOverheadMultiplier: (state) => {
      if (!state.enableRocksdbOverheadModeling || state.stateBackend !== 'rocksdb') {
        return 1.0;
      }
      
      // Combine all overhead multipliers
      const indexOverhead = state.rocksdbIndexMultiplier;
      const compactionOverhead = state.rocksdbCompactionMultiplier;
      const metadataOverhead = state.rocksdbMetadataMultiplier;
      
      // Compression type affects overhead
      const compressionMultipliers = {
        'none': 1.0,
        'snappy': 1.0,
        'zlib': 0.9, // better compression = less space but more CPU
        'lz4': 0.95,
        'bzip2': 0.85
      };
      const compressionMultiplier = compressionMultipliers[state.rocksdbCompressionType] || 1.0;
      
      return indexOverhead * compactionOverhead * metadataOverhead * compressionMultiplier;
    },
    
    rocksdbOverheadDescription: (state) => {
      if (!state.enableRocksdbOverheadModeling || state.stateBackend !== 'rocksdb') {
        return 'Simple state size calculation (no RocksDB overhead modeling)';
      }
      
      const total = state.rocksdbTotalOverheadMultiplier;
      const overheadPercent = ((total - 1) * 100).toFixed(0);
      return `RocksDB overhead: index ${state.rocksdbIndexMultiplier}x × compaction ${state.rocksdbCompactionMultiplier}x × metadata ${state.rocksdbMetadataMultiplier}x = ${total.toFixed(2)}x total (+${overheadPercent}%)`;
    }
  },
  
  actions: {
    updateEnvironment(updates) {
      Object.assign(this, updates);
      
      // Keep slots aligned with cores by default
      if (updates.coresPerTM !== undefined && updates.slotsPerTM === undefined) {
        this.slotsPerTM = updates.coresPerTM;
      }
    },
    
    reset() {
      this.slotsPerTM = 4;
      this.coresPerTM = 4;
      this.tmProcessMemoryGiB = 16;
      this.jmProcessMemoryGiB = 4;
      this.stateBackend = 'rocksdb';
      this.checkpointIntervalSec = 300;
      this.maxCheckpointDurationSec = 120;
      this.javaVersion = '17';
      this.flinkVersion = '1.20';
      this.useEfficiencyAdjustments = true;
      this.recordWireSizeBytes = 1000;
      this.recordLogicalSizeBytes = 1000;
      this.recordFormat = 'avro';
      this.compressionCodec = 'none';
      this.useFlip49 = false;
      this.deploymentType = 'standalone';
      this.flip49NetworkFraction = 0.1;
      this.flip49ManagedFraction = 0.4;
      this.flip49OverheadFraction = 0.1;
      this.flip49NetworkMemoryMin = 64;
      this.flip49NetworkMemoryMax = 1024;
      this.flip49OverheadMemoryMin = 192;
      this.flip49OverheadMemoryMax = 768;
      this.flip49MetaspaceSize = 96;
      this.flip49DirectMemoryCap = 512;
      this.flip49HeapCutoffMin = 1024;
      this.flip49HeapCutoffRatio = 0.8;
      this.checkpointStorageBackend = 's3';
      this.checkpointDeployment = 'aws';
      this.checkpointIOThroughputMBps = null;
      // Source constraints and skew modeling
      this.maxSourceParallelism = null;
      this.enableSkewModeling = false;
      this.skewFactor = 1.0;
      this.keyByMultiplier = 0.8;
      // RocksDB state overhead modeling
      this.enableRocksdbOverheadModeling = false;
      this.rocksdbIndexMultiplier = 1.2;
      this.rocksdbCompactionMultiplier = 1.3;
      this.rocksdbMetadataMultiplier = 1.1;
      this.rocksdbBlockSizeKB = 4;
      this.rocksdbCompressionType = 'snappy';
    }
  }
});
