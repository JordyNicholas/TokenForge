import { describe, expect, it } from "vitest";
import { classifyFiletype } from "../classify/classify";
import { MIN_DENSITY_FILES } from "../domain/constants";
import { foldAssetDirectories, isAssetDirectoryGlob, type DensityInput } from "./density";

/** Score paths the way `scan` does, so the tests state paths and nothing else. */
function inputs(paths: readonly string[]): DensityInput[] {
  return paths.map((path) => ({
    path,
    fileClass: classifyFiletype(path),
    bytes: 400,
    estTokens: 100,
  }));
}

function icons(dir: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${dir}/icon-${index}.svg`);
}

describe("foldAssetDirectories", () => {
  it("folds a directory of nothing but assets", () => {
    const folds = foldAssetDirectories(inputs(icons("shared/static/brands", 12)));

    expect(folds).toHaveLength(1);
    expect(folds[0]).toMatchObject({
      dir: "shared/static/brands",
      glob: "shared/static/brands/**",
      bytes: 4_800,
      estTokens: 1_200,
    });
    expect(folds[0]!.paths).toHaveLength(12);
  });

  it("leaves a directory under the file floor alone", () => {
    const folds = foldAssetDirectories(
      inputs(icons("assets/logos", MIN_DENSITY_FILES - 1)),
    );

    expect(folds).toEqual([]);
  });

  it("refuses a directory holding source or config anywhere below it", () => {
    // The veto is recursive on purpose: the glob would reach `build.ts`, which
    // sits two levels under the directory that would have folded.
    const folds = foldAssetDirectories(
      inputs([...icons("assets", 12), "assets/scripts/build.ts"]),
    );

    expect(folds).toEqual([]);
  });

  it("still folds a sibling the veto does not reach", () => {
    const folds = foldAssetDirectories(
      inputs([
        ...icons("assets/icons", 12),
        "assets/brand/logo.svg",
        "assets/brand/palette.ts",
      ]),
    );

    expect(folds.map((fold) => fold.glob)).toEqual(["assets/icons/**"]);
  });

  it("takes the shallowest safe directory, not one glob per level", () => {
    const folds = foldAssetDirectories(
      inputs([...icons("press-kit", 9), ...icons("press-kit/screens", 9)]),
    );

    expect(folds.map((fold) => fold.glob)).toEqual(["press-kit/**"]);
    // The nested files are subsumed rather than dropped — the fold has to
    // account for every token it speaks for.
    expect(folds[0]!.paths).toHaveLength(18);
    expect(folds[0]!.estTokens).toBe(1_800);
  });

  it("needs a media supermajority, not merely an absence of source", () => {
    // Ten opaque blobs are not assets. No reason in the contract is true of
    // them, so they stay per-file rather than folding under a borrowed one.
    const blobs = Array.from({ length: 10 }, (_, index) => `data/blob-${index}.dat`);

    expect(foldAssetDirectories(inputs(blobs))).toEqual([]);
    // One stray text file among assets is within tolerance.
    expect(
      foldAssetDirectories(inputs([...icons("assets/icons", 12), "assets/icons/NOTES.txt"])),
    ).toHaveLength(1);
  });

  it("keeps an open editor path out of a fold", () => {
    const paths = icons("assets/icons", 12);
    const folds = foldAssetDirectories(inputs(paths), {
      keepPaths: new Set([paths[0]!]),
    });

    // A fold speaks for everything under it, so it cannot be honest about a
    // directory holding a path the session wants kept.
    expect(folds).toEqual([]);
  });

  it("marks its output so consumers can read the shape", () => {
    const [fold] = foldAssetDirectories(inputs(icons("docs/images", 10)));

    expect(isAssetDirectoryGlob(fold!.glob)).toBe(true);
    expect(isAssetDirectoryGlob("docs/images/cover.jpg")).toBe(false);
  });
});
