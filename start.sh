#!/bin/bash
# Quick start - Run this to start the Energy Trading Platform

echo "🚀 Starting Energy Trading Platform..."
echo ""

# Check if run.sh exists
if [ ! -f "run.sh" ]; then
    echo "❌ Error: run.sh not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Make sure run.sh is executable
chmod +x run.sh

# Run the main startup script with option 3 (both services)
echo "Starting both backend and frontend..."
echo ""
echo "3" | ./run.sh

echo ""
echo "✅ Energy Trading Platform is ready!"
echo ""
echo "🌐 Access the application:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:5000"
echo ""
echo "📖 For more information, see QUICKSTART.md"
