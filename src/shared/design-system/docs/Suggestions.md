## Design System Suggestions:

### File Input:

- The forms I want to be available for the file input component are:

1.  Standard Input:
    - The classic form that resembles regular text fields, and is often used in long forms that do not require much space.
    - Description: A button next to text showing the selected file name or "No file chosen".
    - Use cases: Updating a CV in a personal profile, or attaching a simple document.
    - When adding an image or images, the delete button appears on the image.

2.  Drag and Drop Zone:
    - Design: A large box with dashed borders, an "upload" icon, and explanatory text.
    - Features: Supports dragging files directly from the desktop, and shows a "Hover" state when dragging a file over it.

3.  Uploading images with preview (Avatar / Image Picker):
    - When the required file is an image, showing the file name is not enough; the user needs to see what they uploaded.
    - Shapes:
      - Circular: For profile pictures.
      - Rectangular: For featured images or product images.
    - Features: A "delete" button appears over the image after uploading.

4.  Uploaded file list (File List / Cards):
    - If the system allows uploading multiple files, a "card" must be designed for each uploaded file showing the status.
    - Required elements:
      - File type icon (PDF, Zip, Image).
      - File name and size.
      - Progress Bar during upload.
      - Delete button (Trash icon) or cancel upload.

5.  Ideas we could add:
    - Loading states and error states.
    - File Restrictions: Add a small [helper] text explaining allowed types (e.g., PNG, PDF up to 5MB).
    - Uploading from external sources: An advanced idea is adding options to upload from Google Drive or Dropbox within the component itself.
    - (Empty State): Ensure the component is designed attractively when empty to encourage interaction.
    - [Make] the component keyboard accessible, so the user can navigate to it via the Tab key and press Enter to open the file browser.



Topic: Avatar Media Component specifications
1. Visual styles (Design Variants)
The component must support four basic styles controlled via props:

Default: Circular shape, without a default background.

Square: Rectangular shape, without a default background.

Outline: Circular shape, with a gray background and a placeholder icon that symbolizes the profile.

Outline Square: A square shape, with a gray background and a placeholder icon.

2. Content Constraints
The component is limited to receiving only one file (Single File Upload) with the following types supported:

Images: Only one image is accepted.

Videos: Only one video is accepted.

Special condition: It must be verified that the field does not contain more than one element at the same time.

3. Functional Requirements
File Handling: Support for drag and drop from outside the browser.

User Interactions:

On hover state: Shows an overlay with two options: “Delete” or “Replace file”.

Video Preview (Video Thumbnail): If the uploaded file is a video, a thumbnail must be automatically generated or displayed to represent the video within the field.

4. Expected technical behavior
The component must be responsive and maintain Aspect Ratio 1:1.

Provide clear callbacks for deletions, uploads, and errors.

Handling empty states based on the chosen style (Outline vs Default).