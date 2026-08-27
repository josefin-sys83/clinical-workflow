from fastapi import APIRouter

# One module per workflow stage, mirroring how the frontend is organised:
#
#   synopsis.py     analyze, derive-scope, consistency
#   scope.py        analyze, required-elements
#   protocol.py     generate, section, section/analyze
#   report.py       section, section/analyze
#   consistency.py  cross, statistical
#
# Add each router here as it lands. See the handoff doc for the full endpoint map and
# which existing TypeScript method each one replaces.

router = APIRouter()
