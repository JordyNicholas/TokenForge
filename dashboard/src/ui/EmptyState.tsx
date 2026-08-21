import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <Box
      sx={{
        py: 6,
        px: 2,
        textAlign: "center",
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 36 * 16, mx: "auto" }}>
        {body}
      </Typography>
    </Box>
  );
}
