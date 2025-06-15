# HTML5 Genetic Cars Makefile
# Provides convenient targets for building and managing the project with Nix

.PHONY: help build all latest clean install serve shell check update-hash debug build-debug

# Default target
all: build

# Display help information
help:
	@echo "HTML5 Genetic Cars - Available Makefile targets:"
	@echo ""
	@echo "  build, all    - Build the main package"
	@echo "  debug         - Build debug bundles and serve locally with DEBUG logging"
	@echo "  build-debug   - Build debug bundles only (without serving)"
	@echo "  clean         - Clean build artifacts"
	@echo "  install       - Install the package to nix profile"
	@echo "  serve         - Serve the application locally for development"
	@echo "  shell         - Enter nix-shell development environment"  
	@echo "  check         - Run checks and tests"
	@echo "  update-hash   - Update npmDepsHash when dependencies change"
	@echo "  help          - Display this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make build                    # Build with nix-build (INFO logging)"
	@echo "  make debug                    # Build debug version and serve (DEBUG logging)"
	@echo "  make build-debug              # Build debug version only (DEBUG logging)"
	@echo "  make serve                    # Serve locally on port 8000"
	@echo ""

# Build the main package using callPackage
build:
	@echo "Building genetic-cars-html5..."
	nix-build -A default -E 'with import <nixpkgs> { }; callPackage ./default.nix { }'

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf result result-*
	@echo "Cleaned."

# Install the package to user's nix profile
install: build
	@echo "Installing genetic-cars-html5 to nix profile..."
	nix-env -i ./result

# Serve the application locally for development
serve: build
	@echo "Starting local server on http://localhost:8000..."
	@echo "Press Ctrl+C to stop the server"
	./result/bin/genetic-cars-serve

# Enter nix-shell for development
shell:
	@echo "Entering development shell..."
	nix-shell -p nodejs nodePackages.npm nodePackages.http-server

# Run checks and tests
check: build
	@echo "Running checks..."
	@echo "✓ Build completed successfully"
	@if [ -x "./result/bin/genetic-cars-serve" ]; then \
		echo "✓ Executable genetic-cars-serve found"; \
	else \
		echo "✗ Executable genetic-cars-serve not found"; \
		exit 1; \
	fi
	@echo "All checks passed."

# Update npmDepsHash when package-lock.json changes
update-hash:
	@echo "Updating npmDepsHash..."
	@if command -v nix-shell >/dev/null 2>&1; then \
		echo "Generating new hash for package-lock.json..."; \
		NEW_HASH=$$(nix-shell -p prefetch-npm-deps --command "prefetch-npm-deps package-lock.json"); \
		echo "New hash: $$NEW_HASH"; \
		echo "Please update the npmDepsHash in default.nix with this value:"; \
		echo "  npmDepsHash = \"$$NEW_HASH\";"; \
	else \
		echo "Error: nix-shell not found. Please install Nix first."; \
		exit 1; \
	fi

# Development target: clean and rebuild
rebuild: clean build

# Development target: watch mode (requires entr)
#watch:
#	@if command -v entr >/dev/null 2>&1; then \
#		echo "Watching for changes... (requires 'entr' package)"; \
#		find src package.json package-lock.json -type f | entr -c make build; \
#	else \
#		echo "Error: 'entr' command not found. Install with: nix-shell -p entr"; \
#		exit 1; \
#	fi

# Debug targets
debug: build-debug
	@echo "Starting debug server on http://localhost:8000..."
	@echo "Debug application with DEBUG logging enabled"
	@echo "Press Ctrl+C to stop the server"
	./result/bin/genetic-cars-serve

build-debug:
	@echo "Building genetic-cars-html5-debug..."
	nix-build -A debug -E 'with import <nixpkgs> { }; callPackage ./default.nix { }'