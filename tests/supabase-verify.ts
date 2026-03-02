import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import process from 'process'
import crypto from 'node:crypto'

// Manual env parsing
const envPath = path.resolve('.env.local')
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=')
        if (key && value && value.length > 0) {
            process.env[key.trim()] = value.join('=').trim()
        }
    })
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function verify() {
    console.log('--- Supabase API Persistence Verification ---')

    // 1. Get a developer to associate the key with
    const { data: dev, error: devError } = await supabase.from('developers').select('id').limit(1).single()
    if (devError || !dev) {
        console.error('No developers found in Supabase.', devError)
        process.exit(1)
    }

    // 2. Create a temporary test key
    const rawKey = 'df_test_' + Math.random().toString(36).substring(7)
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')

    const { error: keyInsertError } = await supabase.from('api_keys').insert({
        developer_id: dev.id,
        key_hash: keyHash,
        key_prefix: 'df_test',
        name: 'Temporary Test Key',
        environment: 'development'
    })

    if (keyInsertError) {
        console.error('Failed to create temporary API key:', keyInsertError)
        process.exit(1)
    }

    console.log('Created temporary test key:', rawKey)

    try {
        // 3. Create a deal via API
        console.log('Creating deal via API...')
        const res = await fetch('http://localhost:3000/api/v1/deals', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${rawKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'sales',
                intent: 'Verify Supabase Persistence ' + new Date().toISOString(),
                constraints: { budget_max: 5000, currency: 'USD' }
            })
        })

        const dealRes: any = await res.json()
        if (!res.ok) {
            console.error('API Error:', dealRes)
            process.exit(1)
        }
        const dealId = dealRes.deal.id
        console.log('Successfully created deal ID:', dealId)

        // 4. Verify in Supabase
        console.log('Checking Supabase for deal record...')
        const { data: dbDeal, error: dbError } = await supabase
            .from('deals')
            .select('*')
            .eq('id', dealId)
            .single()

        if (dbError || !dbDeal) {
            console.error('Deal NOT found in Supabase!', dbError)
            process.exit(1)
        }
        console.log('Deal persistent in Supabase!')

        // 5. Perform an action (e.g., offer)
        console.log('Adding an offer via API...')
        const actionRes = await fetch(`http://localhost:3000/api/v1/deals/${dealId}/actions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${rawKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'offer',
                actor: 'VerifyScript',
                payload: { price: 4500, currency: 'USD', notes: 'API Verification Offer' }
            })
        })

        if (!actionRes.ok) {
            console.error('Action API Error:', await actionRes.text())
            process.exit(1)
        }
        console.log('Offer added!')

        // 6. Verify offer in Supabase
        const { data: dbOffers, error: offersError } = await supabase
            .from('deal_offers')
            .select('*')
            .eq('deal_id', dealId)

        if (offersError || !dbOffers || dbOffers.length === 0) {
            console.error('Offer NOT found in Supabase!', offersError)
            process.exit(1)
        }
        console.log('Offer persistent in Supabase!')

        console.log('--- Verification Successful! ---')

    } catch (err) {
        console.error('Unexpected error during verification:', err)
        process.exit(1)
    } finally {
        // Cleanup temporary key
        console.log('Cleaning up temporary API key...')
        await supabase.from('api_keys').delete().eq('key_hash', keyHash)
    }
}

verify()
