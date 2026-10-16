import React from 'react';
import { Box, Card, CardContent, Chip, Divider, List, ListItem, ListItemText, Typography } from '@mui/material';
import versionInfo from '../version.json';

const formatDate = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const AboutPage: React.FC = () => (
  <Box>
    <Typography variant="h4" gutterBottom>
      About HR Mini
    </Typography>

    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          Current version
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <Typography variant="h3" sx={{ fontWeight: 600 }}>
            {versionInfo.version}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Updated {formatDate(versionInfo.release_date)}
          </Typography>
        </Box>
      </CardContent>
    </Card>

    <Typography variant="h6" gutterBottom>
      Version history
    </Typography>
    <Card>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        {versionInfo.history.map((release, index) => (
          <React.Fragment key={release.version}>
            {index > 0 && <Divider />}
            <Box sx={{ px: 2, pt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {release.version}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(release.date)}
                </Typography>
                {release.version === versionInfo.version && <Chip label="Current" size="small" color="primary" />}
              </Box>
              <List dense>
                {release.changes.map((change) => (
                  <ListItem key={change} sx={{ py: 0 }}>
                    <ListItemText primary={`• ${change}`} />
                  </ListItem>
                ))}
              </List>
            </Box>
          </React.Fragment>
        ))}
      </CardContent>
    </Card>
  </Box>
);

export default AboutPage;
