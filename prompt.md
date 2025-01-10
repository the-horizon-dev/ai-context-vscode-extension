VSCode Extension: Copy Project Context

This Visual Studio Code extension allows users to effortlessly copy selected files and their content as context for AI models or other purposes. Key features include:

- Selective File Copying: Users can choose specific files to include as context, ensuring only relevant information is copied.
  
- File Parsing Based on Type, example: 
  - If a selected file is `.js`, its content will be parsed and wrapped as:  
    ```javascript
    file.content
    ```
  - If a selected file is `.ts`, its content will be parsed and wrapped as:  
    ```typescript
    file.content
    ```

- One-Step Copy: The entire formatted context is instantly available for pasting via `CTRL + V`, streamlining the process of sharing with AI tools or other platforms.

- File Management: Users can easily remove files from the selected context before copying, maintaining control over the final output.
