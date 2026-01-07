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
- **Source Constraints & Skew Modeling** ✨ NEW
  - Max source parallelism constraints (e.g., Kafka partitions)
  - Advanced skew modeling beyond flat keyBy penalties
  - Skew factor configuration (p95 hot key concentration)
  - Constraint propagation through downstream operators
- **RocksDB State Overhead Modeling** ✨ NEW
  - Configurable index overhead multiplier (1.1-1.5x typical)
  - Compaction amplification modeling (1.2-1.8x typical)
  - Metadata overhead calculation (1.05-1.15x typical)
  - Compression type impact on space efficiency
  - Block size optimization for index vs read amplification trade-offs
- **Checkpoint I/O & Storage Throughput Analysis** 
  - Automatic state volume calculation
  - RocksDB overhead estimation (write amplification + metadata)
  - Checkpoint duration estimation
  - Storage backend throughput assumptions (S3, HDFS, NFS, local)
  - Configuration recommendations (interval, max duration)
  - RocksDB-specific guidance (compaction, incremental checkpoints)
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

**Source Constraints:**
```
P_source = min(P_calculated, max_source_parallelism)
P_downstream = min(P_calculated, max_source_parallelism)
```

**Skew Modeling:**
```
Legacy: capacity_adjusted = capacity × keyBy_multiplier
Advanced: capacity_adjusted = capacity × keyBy_multiplier × (skew_factor / 1.5)
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

### 6. Checkpoint I/O & Storage Analysis

For each stateful operator:
```
State per subtask = (keys × bytesPerKey × TTL_factor) / parallelism
Total state = Σ(State per subtask × parallelism) across all operators
```

RocksDB overhead:
```
Checkpoint data = Total state × 1.2 (write amplification) × 1.05 (metadata)
                = Total state × 1.26 (for RocksDB)
```

Checkpoint duration:
```
Duration = Checkpoint data (GiB) × 1024 MB / Throughput (MB/s)
```

Configuration validation:
```
Min checkpoint interval ≥ 2 × Duration (avoid cascading)
Max checkpoint duration ≥ 1.5 × Duration (safety margin)
```

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

## Checkpoint I/O Analysis

The calculator now provides comprehensive checkpoint I/O analysis:

**Key Metrics:**
- **Total State Size**: Sum of state across all stateful operators
- **Checkpoint Data Volume**: Accounts for RocksDB write amplification (1.2x) and metadata overhead (1.05x)
- **Checkpoint Duration**: Estimated time to write checkpoint based on storage throughput
- **Required Throughput**: Minimum I/O rate needed to meet checkpoint SLA

**Storage Backend Support:**
- **S3 / Object Storage**: 80-100 MB/s (auto-detect for AWS)
- **HDFS**: 150 MB/s
- **NFS**: 200 MB/s  
- **Local Disk**: 400 MB/s
- **SSD**: 350 MB/s
- **Custom**: Override with measured throughput

**RocksDB-Specific Guidance:**
- Write amplification explanation
- Block cache sizing recommendations
- Compaction considerations
- Incremental checkpoint benefits (50-90% data reduction)

**Configuration Recommendations:**
- Minimum checkpoint interval (2x duration to avoid cascading)
- Recommended storage backend (by checkpoint size)
- Recommended max checkpoint duration (safety margins)

**See also**: [Checkpoint I/O Estimation Guide](./CHECKPOINT_IO_FEATURE_GUIDE.md) for detailed usage.

## Source Constraints & Skew Modeling

The calculator now provides advanced parallelism constraints and realistic skew modeling:

### Source Constraints

**Max Source Parallelism:**
- Limits parallelism for source operators (e.g., Kafka topic partitions)
- Automatically propagates constraints to all downstream operators
- Prevents over-provisioning when source data is partition-limited

**Example:**
- Kafka topic with 12 partitions → Max source parallelism = 12
- Downstream operators capped at 12 regardless of calculated requirements
- Ensures realistic infrastructure sizing

### Advanced Skew Modeling

**Legacy Mode (Default):**
- Flat 20% penalty for all keyBy operations
- Simple but may under/overestimate for extreme skew scenarios

**Advanced Mode:**
- Configurable skew factor (p95 hot key concentration)
- Skew factor of 2.0 = 2x concentration in hot keys
- Formula: `effective_penalty = base_penalty × (skew_factor / 1.5)`
- More realistic parallelism recommendations for hot-key workloads

**Skew Factor Examples:**
- `1.0` = No skew (perfectly uniform distribution)
- `2.0` = Moderate skew (2x concentration in hot keys)
- `3.0` = High skew (3x concentration in hot keys)
- `5.0` = Extreme skew (5x concentration in hot keys)

## RocksDB State Overhead Modeling

The calculator now provides detailed RocksDB overhead modeling beyond simple `keys × bytesPerKey` calculations:

### Overhead Components

**Index Overhead:**
- Accounts for block indexes, bloom filters, and other index structures
- Typical range: 1.1-1.5x (10-50% overhead)
- Larger block sizes reduce index overhead but increase read amplification

**Compaction Amplification:**
- Temporary space usage during SST file compaction
- Typical range: 1.2-1.8x (20-80% overhead)
- Depends on compaction strategy and write patterns

**Metadata Overhead:**
- WAL (Write-Ahead Log), manifest files, and other RocksDB metadata
- Typical range: 1.05-1.15x (5-15% overhead)
- Relatively constant across workloads

**Compression Impact:**
- Different compression algorithms affect space efficiency and CPU usage
- Snappy: Good balance (1.0x space factor)
- Zlib: Better compression but more CPU (0.9x space factor)
- LZ4: Fast compression (0.95x space factor)
- Bzip2: Best compression but slow (0.85x space factor)

### Configuration Examples

**Conservative Configuration:**
- Index: 1.5x, Compaction: 1.8x, Metadata: 1.15x
- Total: ~3.1x overhead (210% increase over raw state)

**Typical Configuration:**
- Index: 1.2x, Compaction: 1.3x, Metadata: 1.1x
- Total: ~1.7x overhead (70% increase over raw state)

**Optimistic Configuration:**
- Index: 1.1x, Compaction: 1.2x, Metadata: 1.05x
- Total: ~1.4x overhead (40% increase over raw state)

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
8. **Validate checkpoint settings** - use I/O analysis recommendations

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
