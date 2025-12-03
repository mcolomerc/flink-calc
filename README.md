# Flink Infrastructure Calculator

A Vue 3 webapp that estimates Apache Flink infrastructure requirements and generates a Bill of Materials (BoM) based on workload, environment, and job topology.

🌐 **Live Demo**: [https://mcolomerc.github.io/flink-calc/](https://mcolomerc.github.io/flink-calc/)

## Features

### 🎯 Core Capabilities

- **Workload Configuration**: Input average/peak rates, latency targets, and headroom multipliers
- **Environment Setup**: Configure TaskManager resources, state backend, and checkpointing
- **Topology Builder**: Visual operator graph with detailed configuration
- **Smart Estimation**: Calculates parallelism using capacity heuristics and real formulas
- **Bill of Materials**: Complete resource breakdown (Task Managers, Job Manager, cores, memory)
- **Export Options**: JSON, CSV, and Flink config file generation

### 📊 Estimation Features

- Per-operator parallelism calculation
- State memory estimation for stateful operators
- Memory split recommendation (heap/managed/network/overhead)
- Checkpoint sanity checks
- Warning system for potential bottlenecks
- Confidence scoring
- Conservative estimates (+50% headroom)

## Getting Started

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```



## Quick Start

1. **Configure Workload** (Step 1)
   - Set input rates (avg/peak)
   - Define latency targets
   - Adjust headroom multiplier

2. **Set Environment** (Step 2)
   - Configure Task Manager resources (cores, memory, slots)
   - Choose state backend (RocksDB/Heap)
   - Set checkpoint parameters

3. **Build Topology** (Step 3)
   - Add operators (source, map, window, sink, etc.)
   - Configure operator properties
   - Connect operators with edges
   - Or load sample topology

4. **View Results** (Step 4)
   - Click "Calculate"
   - Review parallelism recommendations
   - Export BoM or Flink config

 

## Data Model

### Workload
```javascript
{
  inputRateAvg: 50000,      // records/sec
  inputRatePeak: 120000,    // records/sec
  burstFactor: 2.4,         // peak/avg
  latencyTargetMs: 2000,    // p95 target
  catchUpMinutes: 15,       // backlog recovery time
  headroom: 1.5             // safety multiplier
}
```

### Environment
```javascript
{
  slotsPerTM: 4,
  coresPerTM: 4,
  tmProcessMemoryGiB: 16,
  jmProcessMemoryGiB: 4,
  stateBackend: 'rocksdb',
  checkpointIntervalSec: 300,
  maxCheckpointDurationSec: 120
}
```

### Operator
```javascript
{
  id: 'op-1',
  name: 'Window Aggregation',
  type: 'window_agg',
  stateful: true,
  inputRatio: 1.0,           // output/input ratio
  costClass: 'medium',       // low/medium/high
  userCapacityOverride: null, // optional override
  
  // State configuration (if stateful)
  keys: 1_000_000,
  bytesPerKey: 512,
  windowSizeSec: 300,
  ttlSec: 3600,
  
  // Shuffle behavior
  keyBy: true,
  repartition: 'hash'
}
```

## Estimation Algorithm

### 1. Capacity Calculation

Default capacities (records/sec/subtask):
- Source: 200K
- Map/Filter: 250K
- FlatMap: 120K
- Window Aggregation: 60K
- Joins: 15-25K
- Async I/O: 80K
- Sink: 150K

Multipliers applied:
- **Cost class**: low=1.2x, medium=1.0x, high=0.6x
- **RocksDB**: 0.7x for stateful ops
- **KeyBy**: 0.8x for potential skew

### 2. Rate Propagation

Topological traversal through DAG:
```
rate_out = rate_in × inputRatio
```

### 3. Parallelism Calculation

```
P_i = ceil((rate_in / capacity) × headroom)
```

### 4. State Memory Estimation

```
M_state = (keys × bytesPerKey × TTL_factor) / parallelism
```

### 5. Resource Aggregation

- Total slots = sum of non-chainable operator parallelism × 1.1
- TaskManagers = ceil(total_slots / slots_per_TM)
- Memory split:
  - Overhead: 10%
  - Network: 10-12%
  - Managed: 25-50% (higher for stateful)
  - Heap: remainder

## Operator Types

| Type | Description | Default Capacity |
|------|-------------|------------------|
| `source` | Kafka, file, socket sources | 200K rec/s |
| `map_filter` | Stateless transformations | 250K rec/s |
| `flatmap` | One-to-many transformations | 120K rec/s |
| `keyby` | Key-based partitioning | 100K rec/s |
| `window_agg` | Windowed aggregations | 60K rec/s |
| `interval_join` | Interval joins | 25K rec/s |
| `temporal_join` | Temporal table joins | 15K rec/s |
| `async_io` | Async enrichment | 80K rec/s |
| `sink` | Database, file, Kafka sinks | 150K rec/s |

## Export Formats

### JSON Export
Complete snapshot including:
- Workload configuration
- Environment settings
- Topology definition
- Typical and conservative estimates

### CSV Export
Operator table with:
- Name, type, input rate
- Capacity, parallelism
- State per subtask

Plus BoM summary.

### Flink Config Export
Ready-to-use `flink-conf.yaml` with:
- Memory configuration
- Parallelism settings
- State backend
- Checkpoint configuration

## Confidence Scoring

The app provides a confidence score based on:
- **Base confidence**: 65% (heuristic-based)
- **Override bonus**: +25% × (operators_with_overrides / total_operators)
- **Max confidence**: 95%

Levels:
- **High** (85%+): Green badge
- **Medium** (70-84%): Yellow badge
- **Low** (<70%): Red badge

## Tips for Accurate Estimates

1. **Use capacity overrides** for operators you've benchmarked
2. **Enable KeyBy flag** for operators with potential skew
3. **Provide accurate state sizes** (keys, bytes/key, TTL)
4. **Start conservative** - use higher headroom initially
5. **Review warnings** - they highlight potential issues
6. **Compare typical vs conservative** estimates
7. **Iterate with real metrics** once deployed

## Sample Topology

The app includes a sample topology demonstrating:
- Kafka Source → Filter/Map → Session Window → Database Sink
- Stateful windowed aggregation
- Realistic state configuration
- Connected operators

Load it via "Load Sample" button in Topology Builder.

## Technology Stack

- **Vue 3**: Composition API with `<script setup>`
- **Vite**: Fast build tool and dev server
- **Pinia**: State management
- **Vue Router**: Client-side routing
- **Vanilla CSS**: Scoped component styles

## Future Enhancements (V2)

- [ ] Import real metrics from running jobs
- [ ] Autoscaler target recommendations 
- [ ] Historical comparison
- [ ] Multi-job analysis
- [ ] Advanced state backend tuning

## License

MIT

## Contributing

Contributions welcome! Please ensure:
- Estimation logic remains in pure JS (`src/estimator`)
- Components are well-documented
- Formulas match Apache Flink behavior

---

Built with ⚡ for Apache Flink users
