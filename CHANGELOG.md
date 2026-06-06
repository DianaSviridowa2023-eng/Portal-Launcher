# Portal Launcher — Changelog

## v1.2.0 (Fixed & Enhanced)

### Bug Fixes (TypeScript)
- **RightSidebar.tsx** — Removed invalid CSS properties `ringColor` / `ringOffsetColor` from inline style (TS2353)
- **FriendsPage.tsx** — Replaced `.at(-1)` with `[arr.length - 1]` for ES2020 compatibility (TS2550)
- **SkinSelectorPage.tsx** — Removed duplicate `background` property from inline style (TS1117)
- **tsconfig.json** — Updated `lib` to include `ES2022` (enables Array.at, Object.hasOwn, etc.)

### Real Minecraft Launch (Rust)
- Full classpath built from `version.json` libraries (not just the jar!)
- Asset index + all asset objects downloaded and verified with SHA-1
- Native libraries extracted to `natives/` before launch
- Correct `mainClass` read from version JSON
- Automatic Java version selection (Java 8 for 1.8-1.16, Java 17 for 1.17-1.19, Java 21 for 1.20+)
- Correct `--assetIndex` passed to game args
- Offline mode support (access token defaults to "0" if empty)
- Error messages improved for diagnosis

### Java Auto-Download
- Download **Java 8, 17, 21** from Eclipse Adoptium API automatically
- Auto-selects correct version per Minecraft version
- Multi-platform support (Windows .zip, Linux/macOS .tar.gz)
- SHA-1 verification after download
- Managed installs stored in `PortalLauncher/minecraft/java/`
- `get_managed_java_versions` command to list installed Java versions

### Build Manager
- `export_instance_zip` — Export instance to ZIP (mods, config, saves, instance.json)
- `import_instance_zip` — Import ZIP into new instance
- `import_modrinth_pack` — Import `.mrpack` Modrinth modpack (downloads all files)
- `duplicate_instance` — Clone instance including mods and configs
- `backup_instance` — Create timestamped backup ZIP in `PortalLauncher/backups/`
- `list_backups` — List all backups with size and date

### Mod Manager
- `check_mod_updates` — Check all Modrinth mods for updates (per MC version + loader)
- `update_mod` — Update a single mod to latest version
- `update_all_mods` — Mass-update all mods with available updates
- `install_mod_dependencies` — Auto-download required dependencies
- `detect_mod_conflicts` — Detect duplicate mods and known incompatible pairs (OptiFine+Sodium, etc.)
- `check_mod_compatibility` — Check if a mod works with the instance's MC version + loader

### Mod Loaders
- `install_neoforge` — NeoForge installer (fetches version from Maven metadata)
- `get_fabric_versions` — List available Fabric loader versions
- `get_forge_versions` — List available Forge versions for MC version
- `get_neoforge_versions` — List available NeoForge versions
- `delete_minecraft_version` — Remove a downloaded version

### Cargo.toml Dependencies Added
- `futures` — Parallel async downloads
- `flate2` — Gzip decompression (tar.gz Java archives)
- `tar` — Tar extraction (Java archives on Linux/macOS)
- `bytes` — Byte buffer types
