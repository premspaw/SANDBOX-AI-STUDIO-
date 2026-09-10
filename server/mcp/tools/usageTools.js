export function getUsageToolDefinitions() {
  return [
    {
      name: 'get_usage',
      description: 'Retrieve current ZeroLens account details, available Shorts credit balance, subscription tier, and recent usage activity.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }
  ];
}

/**
 * Handle execution of get_usage tool
 */
export async function executeGetUsage(args, user, deps) {
  if (!user || !user.id) {
    throw new Error('Authentication required: user context missing.');
  }

  const { supabaseAdmin, supabase } = deps;
  const dbClient = supabaseAdmin || supabase;

  let tier = 'FREE';
  let shortsBalance = 50;
  let totalGenerations = 0;
  let recentTransactions = [];

  if (dbClient) {
    try {
      // 1. Fetch profile
      const { data: profile } = await dbClient
        .from('profiles')
        .select('tier, shorts_balance, brand_voice')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        tier = profile.tier || 'STARTER';
        const fractional = profile.brand_voice?.fractional_shorts || 0;
        shortsBalance = (profile.shorts_balance ?? 0) + fractional;
      }

      // 2. Fetch recent transactions
      const { data: txs } = await dbClient
        .from('shorts_transactions')
        .select('id, amount, action_type, reason, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (txs) {
        recentTransactions = txs.map((tx) => ({
          id: tx.id,
          amount: tx.amount,
          type: tx.amount < 0 ? 'spend' : 'credit',
          reason: tx.reason || tx.action_type || 'Usage',
          created_at: tx.created_at
        }));
      }

      // 3. Count total assets
      const { count } = await dbClient
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      totalGenerations = count || 0;

    } catch (err) {
      console.warn('[MCP Usage] Error fetching user profile/usage:', err.message);
    }
  }

  return {
    user_id: user.id,
    email: user.email,
    tier,
    shorts_balance: shortsBalance,
    total_assets_created: totalGenerations,
    recent_transactions: recentTransactions
  };
}
