{ 
  lib,
  nodejs,
  buildNpmPackage,
  nix-gitignore
}:

let
  # Shared installPhase function to eliminate duplication
  mkInstallPhase = { debug ? false, openBrowser ? true }: ''
    runHook preInstall
    
    mkdir -p $out/srv/genetic-cars
    
    # Copy built assets and necessary files
    cp -r index.html graphs.html styles.css $out/srv/genetic-cars/
    ${if debug then ''
      # Copy debug bundles (works for both build methods)
      cp bundle-debug.js $out/srv/genetic-cars/bundle.js
      cp bundle-bare-debug.js $out/srv/genetic-cars/bundle-bare.js
      # Also keep original debug names for reference
      cp bundle-debug.js bundle-bare-debug.js $out/srv/genetic-cars/
    '' else ''
      # Copy production bundles
      cp bundle.js bundle-bare.js $out/srv/genetic-cars/
    ''}
    cp -r lib/ display/ $out/srv/genetic-cars/
    
    # Install scripts using substituteAll
    mkdir -p $out/bin
    
    # Prepare substitution variables
    export out=$out
    export nodejs=${nodejs}
    export openBrowser="${lib.optionalString openBrowser " -o"}"
    
    # Install serve script
    substituteAll ${./scripts/genetic-cars-serve.sh.in} $out/bin/genetic-cars-serve
    chmod +x $out/bin/genetic-cars-serve
    
    # Install daemon script
    substituteAll ${./scripts/genetic-cars-daemon.sh.in} $out/bin/genetic-cars-daemon
    chmod +x $out/bin/genetic-cars-daemon
    
    runHook postInstall
  '';

  # Shared meta information
  mkMeta = {}: {
    description = "HTML5 Genetic Cars 2 - A modified genetic algorithm car evolver";
    longDescription = ''
      HTML5 Genetic Cars is a genetic algorithm car evolver implemented in HTML5 canvas.
      It uses Box2D physics engine to evolve random two-wheeled shapes into cars over generations.
    '';
    homepage = "https://github.com/bojeran/HTML5_Genetic_Cars_2";
    license = lib.licenses.zlib;
    maintainers = [ ];
    platforms = lib.platforms.all;
    mainProgram = "genetic-cars-serve";
  };

  # This variation uses the mkDerivation and skips the buildPhase
  # To use this this you need to prebuild the bundle files (as version 1 did)
  #mkGeneticCars = { debug ? false, openBrowser ? true }: stdenv.mkDerivation rec {
  #  pname = "genetic-cars-html5${lib.optionalString debug "-debug"}";
  #  version = "2.0.0";

  #  src = nix-gitignore.gitignoreSourcePure [ ./.gitignore ] ./.;

  #  # No build dependencies needed since bundles are pre-built
  #  nativeBuildInputs = [ ];

  #  # No build phase needed since JavaScript bundles already exist
  #  dontBuild = true;

  #  installPhase = mkInstallPhase { inherit debug openBrowser; };

  #  meta = mkMeta { };
  #};

  # NPM-based build using buildNpmPackage
  mkGeneticCarsNpm = { debug ? false, openBrowser ? true }: buildNpmPackage rec {
    pname = "genetic-cars-html5${lib.optionalString debug "-npm"}${lib.optionalString debug "-debug"}";
    version = "2.0.0";
    
    src = nix-gitignore.gitignoreSourcePure [ ./.gitignore ] ./.;
    
    npmDepsHash = "sha256-FkQqeYInsgrqpNe9Kz4ga1JxOvVjHm0gznNdjP9rF8I=";
    
    # Skip optional dependencies to avoid issues
    npmInstallFlags = [ "--no-optional" ];

    # Override build phase to run appropriate npm script
    buildPhase = ''
      runHook preBuild
      
      ${if debug then ''
        echo "Building debug bundles with DEBUG logging using npm..."
        npm run build-debug
      '' else ''
        echo "Building production bundles with INFO logging using npm..."
        npm run build
      ''}
      
      runHook postBuild
    '';
    
    # Use shared install phase
    installPhase = mkInstallPhase { inherit debug openBrowser; };
    
    meta = mkMeta { };
  };
in
{
  # Default build
  default = mkGeneticCarsNpm { debug = false; };

  # Debug build
  debug = mkGeneticCarsNpm { debug = true; };
}