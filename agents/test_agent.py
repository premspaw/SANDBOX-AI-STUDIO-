import sys
import os

# Add agents directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from cinematic_director.agent import root_agent
    print("SUCCESS: root_agent loaded successfully!")
    print(f"Agent Name: {root_agent.name}")
    print(f"Sub-agents: {[sa.name for sa in root_agent.sub_agents]}")
except Exception as e:
    print(f"Error importing root_agent: {e}")
