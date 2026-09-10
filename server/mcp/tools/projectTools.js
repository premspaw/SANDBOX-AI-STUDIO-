export function getProjectToolDefinitions() {
  return [
    {
      name: 'list_projects',
      description: 'List existing user projects, creative folders, and asset counts in ZeroLens.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of projects to return. Default: 20',
            default: 20
          }
        }
      }
    },
    {
      name: 'get_project',
      description: 'Retrieve details, metadata, and recent generated image and video assets for a specific project.',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: {
            type: 'string',
            description: 'The ID or folder name of the project to retrieve.'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of assets to retrieve. Default: 20',
            default: 20
          }
        },
        required: ['project_id']
      }
    }
  ];
}

/**
 * Handle execution of list_projects tool
 */
export async function executeListProjects(args, user, deps) {
  if (!user || !user.id) {
    throw new Error('Authentication required: user context missing.');
  }

  const { supabaseAdmin, supabase } = deps;
  const dbClient = supabaseAdmin || supabase;
  const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50);

  const projectsMap = new Map();
  // Always include the default project
  projectsMap.set('default', {
    id: 'default',
    name: 'Default Project',
    asset_count: 0,
    last_updated: new Date().toISOString()
  });

  if (dbClient) {
    try {
      // Query user's assets to group by project
      const { data: assets, error } = await dbClient
        .from('assets')
        .select('id, metadata, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && assets) {
        assets.forEach((asset) => {
          const pId = asset.metadata?.projectId || asset.metadata?.project_id || asset.metadata?.folder || 'default';
          const existing = projectsMap.get(pId);
          if (existing) {
            existing.asset_count += 1;
            if (new Date(asset.created_at) > new Date(existing.last_updated)) {
              existing.last_updated = asset.created_at;
            }
          } else {
            projectsMap.set(pId, {
              id: pId,
              name: pId === 'default' ? 'Default Project' : (pId.charAt(0).toUpperCase() + pId.slice(1).replace(/[-_]/g, ' ')),
              asset_count: 1,
              last_updated: asset.created_at
            });
          }
        });
      }
    } catch (err) {
      console.warn('[MCP Projects] Error listing user assets for projects:', err.message);
    }
  }

  const projectList = Array.from(projectsMap.values()).slice(0, limit);

  return {
    user_id: user.id,
    total_projects: projectList.length,
    projects: projectList
  };
}

/**
 * Handle execution of get_project tool
 */
export async function executeGetProject(args, user, deps) {
  if (!user || !user.id) {
    throw new Error('Authentication required: user context missing.');
  }

  const { project_id, limit = 20 } = args;
  if (!project_id) {
    throw new Error('Missing project_id parameter.');
  }

  const { supabaseAdmin, supabase } = deps;
  const dbClient = supabaseAdmin || supabase;
  const maxAssets = Math.min(Math.max(Number(limit) || 20, 1), 50);

  let assetsList = [];

  if (dbClient) {
    try {
      const { data: assets, error } = await dbClient
        .from('assets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && assets) {
        const filtered = assets.filter((a) => {
          const pId = a.metadata?.projectId || a.metadata?.project_id || a.metadata?.folder || 'default';
          return pId === project_id || (project_id === 'default' && (!pId || pId === 'default'));
        });

        assetsList = filtered.slice(0, maxAssets).map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type || 'image',
          url: a.url,
          prompt: a.metadata?.prompt || a.prompt || '',
          model: a.model || a.metadata?.engine || '',
          aspect_ratio: a.metadata?.aspect || a.metadata?.aspectRatio || '16:9',
          created_at: a.created_at
        }));
      }
    } catch (err) {
      console.warn('[MCP Projects] Error retrieving project assets:', err.message);
    }
  }

  return {
    project_id,
    name: project_id === 'default' ? 'Default Project' : (project_id.charAt(0).toUpperCase() + project_id.slice(1).replace(/[-_]/g, ' ')),
    total_assets: assetsList.length,
    assets: assetsList
  };
}
