#!/bin/bash

# DocuSign Worker Docker Helper Scripts
# Make this file executable: chmod +x docker-scripts.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function for colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
check_env_file() {
    if [ ! -f .env ]; then
        print_error ".env file not found!"
        echo "Please create a .env file with your DocuSign credentials."
        if [ -f docker.env.template ]; then
            echo "You can copy from docker.env.template:"
            echo "  cp docker.env.template .env"
        elif [ -f .env.example ]; then
            echo "You can copy from .env.example:"
            echo "  cp .env.example .env"
        fi
        echo "Then edit .env with your actual DocuSign credentials."
        exit 1
    fi
    print_success ".env file found"
}

# Build the Docker image
build() {
    print_status "Building DocuSign Worker Docker image..."
    docker-compose build
    print_success "Docker image built successfully"
}

# Start the services
start() {
    check_env_file
    print_status "Starting DocuSign Worker..."
    docker-compose up -d
    print_success "DocuSign Worker started successfully"
    print_status "API available at: http://localhost:3000"
    print_status "Health check: http://localhost:3000/api/health"
}

# Stop the services
stop() {
    print_status "Stopping DocuSign Worker..."
    docker-compose down
    print_success "DocuSign Worker stopped"
}

# Restart the services
restart() {
    print_status "Restarting DocuSign Worker..."
    docker-compose restart
    print_success "DocuSign Worker restarted"
}

# View logs
logs() {
    print_status "Viewing DocuSign Worker logs..."
    docker-compose logs -f docusign-worker
}

# Run in development mode (with live reload)
dev() {
    check_env_file
    print_status "Starting DocuSign Worker in development mode..."
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
}

# Test the DocuSign configuration
test() {
    check_env_file
    print_status "Testing DocuSign configuration..."
    docker-compose exec docusign-worker node test-docusign.js
}

# Clean up Docker resources
clean() {
    print_warning "This will remove all stopped containers, unused networks, and dangling images"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning up Docker resources..."
        docker-compose down -v
        docker system prune -f
        print_success "Docker cleanup completed"
    else
        print_status "Cleanup cancelled"
    fi
}

# Show service status
status() {
    print_status "DocuSign Worker service status:"
    docker-compose ps
    echo
    
    # Check if service is healthy
    if docker-compose ps | grep -q "Up (healthy)"; then
        print_success "Service is running and healthy"
        echo
        print_status "Testing API endpoint..."
        if curl -s http://localhost:3000/api/health > /dev/null; then
            print_success "API is responding"
        else
            print_warning "API is not responding"
        fi
    elif docker-compose ps | grep -q "Up"; then
        print_warning "Service is running but health check pending"
    else
        print_error "Service is not running"
    fi
}

# Show help
help() {
    echo "DocuSign Worker Docker Helper Scripts"
    echo ""
    echo "Usage: ./docker-scripts.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build     Build the Docker image"
    echo "  start     Start the services in detached mode"
    echo "  stop      Stop the services"
    echo "  restart   Restart the services"
    echo "  logs      View service logs (follow mode)"
    echo "  dev       Start in development mode (with logs)"
    echo "  test      Run DocuSign configuration test"
    echo "  status    Show service status and health"
    echo "  clean     Clean up Docker resources (removes containers and volumes)"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./docker-scripts.sh build"
    echo "  ./docker-scripts.sh start"
    echo "  ./docker-scripts.sh logs"
    echo "  ./docker-scripts.sh test"
}

# Main script logic
case "$1" in
    build)
        build
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs
        ;;
    dev)
        dev
        ;;
    test)
        test
        ;;
    status)
        status
        ;;
    clean)
        clean
        ;;
    help|--help|-h)
        help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        help
        exit 1
        ;;
esac