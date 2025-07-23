from bitcoinlib.keys import Key
from bitcoinlib.wallets import Wallet, wallet_delete_if_exists
from bitcoinlib.mnemonic import Mnemonic
import json

def recover_wallet(wallet_data):
    try:
        # Parse wallet data
        data = json.loads(wallet_data)
        
        # Create temporary wallet
        wallet_name = 'temp_wallet'
        wallet_delete_if_exists(wallet_name)
        
        # Create wallet from private key or seed
        if 'private_key' in data:
            wallet = Wallet.create(
                wallet_name,
                keys=Key(data['private_key']),
                network='bitcoin'
            )
        elif 'seed' in data:
            wallet = Wallet.create(
                wallet_name,
                seed=data['seed'],
                network='bitcoin'
            )
        else:
            raise ValueError("No private key or seed found in wallet data")

        # Get key info
        key = wallet.get_key()
        
        # Generate addresses
        legacy_address = key.address_obj.address
        segwit_address = key.address_obj.segwit.address
        
        # Generate new seed phrase
        mnemonic = Mnemonic().generate()
        
        return {
            'private_key': key.private_hex,
            'public_key': key.public_hex,
            'legacy_address': legacy_address,
            'segwit_address': segwit_address,
            'seed_phrase': mnemonic
        }
        
    except Exception as e:
        return {'error': str(e)}