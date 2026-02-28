# OR-Tools Shift Schedule Optimizer

Python service using Google OR-Tools CP-SAT solver for optimal shift schedule generation.

## Features

- **18+ constraint types** for Japanese restaurant operations
- **Configurable penalty weights** for soft constraints
- **HARD/SOFT constraint toggle** per constraint type
- **Mathematical optimality** - provably optimal solutions

## API Endpoints

### Health Check
```
GET /health
Response: {"status": "healthy", "service": "ortools-optimizer", "version": "1.0"}
```

### Optimize Schedule
```
POST /optimize
Content-Type: application/json

{
  "staffMembers": [...],
  "dateRange": ["2024-01-01", "2024-01-31"],
  "constraints": {...},
  "prefilledSchedule": {...},
  "timeout": 30
}

Response: {
  "success": true,
  "schedule": {"staffId": {"2024-01-01": "×", ...}},
  "solve_time": 1.23,
  "is_optimal": true,
  "violations": [...]
}
```

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
python scheduler.py
# Server starts on http://localhost:5000

# Run tests
pytest test_scheduler.py -v
```

## Docker

```bash
# Build image
docker build -t ortools-optimizer .

# Run container
docker run -p 5050:5000 ortools-optimizer

# Test health
curl http://localhost:5050/health
```

## Constraint Types

| Constraint | Type | Description |
|------------|------|-------------|
| Calendar Rules | HARD | must_day_off / must_work dates |
| Staff Groups | HYBRID | Only 1 member off per group per day |
| Daily Limits | SOFT/HARD | Min/max staff off per day |
| Monthly Limits | SOFT/HARD | Min/max off days per staff |
| 5-Day Rest | SOFT/HARD | Max 5 consecutive work days |
| Staff Type Limits | SOFT | Per-type (社員/派遣/パート) limits |
| Priority Rules | SOFT | Day-of-week preferences |
| Adjacent Conflicts | SOFT | No xx, sx, xs patterns |
| Backup Coverage | SOFT | Backup staff when group member off |

## Penalty Weights

Default weights (configurable via API):

```python
{
    'staff_group': 100,
    'daily_limit': 50,
    'daily_limit_max': 50,
    'monthly_limit': 80,
    'adjacent_conflict': 30,
    '5_day_rest': 200,
    'staff_type_limit': 60,
    'backup_coverage': 500,
    'staff_status_shift': 150
}
```

## Integration with NestJS

The NestJS backend calls this service via HTTP:

```typescript
// apps/api/src/shifts/ortools.client.ts
const response = await fetch('http://ortools:5000/optimize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(optimizeRequest)
});
```
