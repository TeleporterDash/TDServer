/**
 * Level validation
 */

const MAX_MATRIX_SIZE = 1000; // max rows or columns
const MAX_TITLE_LENGTH = 200;
const MAX_AUTHOR_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2000;

/**
 * Validate a level submission.
 * Returns an error string if invalid, or null if valid.
 */
export function validateLevel(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return "Level data must be a non-null object";
  }

  const d = data as Record<string, unknown>;

  // Title
  if (typeof d.title !== "string" || d.title.trim().length === 0) {
    return "Title is required and must be a non-empty string";
  }
  if (d.title.length > MAX_TITLE_LENGTH) {
    return `Title must be ${MAX_TITLE_LENGTH} characters or fewer`;
  }

  // Author
  if (typeof d.author !== "string" || d.author.trim().length === 0) {
    return "Author is required and must be a non-empty string";
  }
  if (d.author.length > MAX_AUTHOR_LENGTH) {
    return `Author must be ${MAX_AUTHOR_LENGTH} characters or fewer`;
  }

  // Description (optional)
  if (d.description !== undefined) {
    if (typeof d.description !== "string") {
      return "Description must be a string";
    }
    if (d.description.length > MAX_DESCRIPTION_LENGTH) {
      return `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`;
    }
  }

  // Matrix
  if (!Array.isArray(d.matrix)) {
    return "Matrix must be an array";
  }
  if (d.matrix.length < 2) {
    return "Matrix must have at least 2 rows (color row + level rows)";
  }
  if (d.matrix.length > MAX_MATRIX_SIZE) {
    return `Matrix must have ${MAX_MATRIX_SIZE} rows or fewer`;
  }

  // Validate first row (color row)
  const colorRow = d.matrix[0];
  if (!Array.isArray(colorRow)) {
    return "First matrix row (color row) must be an array";
  }
  if (colorRow.length === 0) {
    return "Color row cannot be empty";
  }
  if (colorRow.length > MAX_MATRIX_SIZE) {
    return `Color row must have ${MAX_MATRIX_SIZE} columns or fewer`;
  }

  // Validate remaining rows (level rows)
  const expectedWidth = colorRow.length;
  for (let i = 1; i < d.matrix.length; i++) {
    const row = d.matrix[i];
    if (!Array.isArray(row)) {
      return `Matrix row ${i} must be an array`;
    }
    if (row.length !== expectedWidth) {
      return `Matrix row ${i} has ${row.length} columns, expected ${expectedWidth}`;
    }
    // Check each cell is a number or string (v1.5.0 or v2.0.0 format)
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (typeof cell !== "number" && typeof cell !== "string") {
        return `Cell at [${i},${j}] must be a number or string, got ${typeof cell}`;
      }
    }
  }

  // Color row cells must be numbers or strings
  for (let j = 0; j < colorRow.length; j++) {
    const cell = colorRow[j];
    if (typeof cell !== "number" && typeof cell !== "string") {
      return `Color cell at [0,${j}] must be a number or string, got ${typeof cell}`;
    }
  }

  // Music (optional)
  if (d.music !== undefined && typeof d.music !== "string") {
    return "Music must be a string";
  }

  return null; // valid
}

/**
 * Validate a music submission.
 */
export function validateMusicSubmission(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return "Music data must be a non-null object";
  }

  const d = data as Record<string, unknown>;

  if (typeof d.title !== "string" || d.title.trim().length === 0) {
    return "Title is required";
  }
  if (d.title.length > MAX_TITLE_LENGTH) {
    return `Title must be ${MAX_TITLE_LENGTH} characters or fewer`;
  }

  if (typeof d.artist !== "string" || d.artist.trim().length === 0) {
    return "Artist is required";
  }
  if (d.artist.length > MAX_AUTHOR_LENGTH) {
    return `Artist must be ${MAX_AUTHOR_LENGTH} characters or fewer`;
  }

  return null;
}

/**
 * Validate a rating submission.
 */
export function validateRating(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return "Rating data must be a non-null object";
  }

  const d = data as Record<string, unknown>;

  if (typeof d.user !== "string" || d.user.trim().length === 0) {
    return "User identifier is required";
  }
  if (typeof d.score !== "number" || d.score < 1 || d.score > 5) {
    return "Score must be a number between 1 and 5";
  }

  return null;
}

/**
 * Validate a comment submission.
 */
export function validateComment(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return "Comment data must be a non-null object";
  }

  const d = data as Record<string, unknown>;

  if (typeof d.text !== "string" || d.text.trim().length === 0) {
    return "Comment text is required";
  }
  if (d.text.length > 1000) {
    return "Comment must be 1000 characters or fewer";
  }

  if (d.author !== undefined && typeof d.author !== "string") {
    return "Author must be a string";
  }

  return null;
}