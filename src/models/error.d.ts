export interface ErrorData {
  message: string,
  error: {
    status: string,
    stack: string,
  }
}
