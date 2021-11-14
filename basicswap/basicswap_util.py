# -*- coding: utf-8 -*-

# Copyright (c) 2021 tecnovert
# Distributed under the MIT software license, see the accompanying
# file LICENSE or http://www.opensource.org/licenses/mit-license.php.


import struct
import hashlib
from enum import IntEnum, auto
from .util import (
    encodeAddress,
    decodeAddress,
)
from .chainparams import (
    chainparams,
)


SEQUENCE_LOCK_BLOCKS = 1
SEQUENCE_LOCK_TIME = 2
ABS_LOCK_BLOCKS = 3
ABS_LOCK_TIME = 4


class MessageTypes(IntEnum):
    OFFER = auto()
    BID = auto()
    BID_ACCEPT = auto()

    XMR_OFFER = auto()
    XMR_BID_FL = auto()
    XMR_BID_SPLIT = auto()
    XMR_BID_ACCEPT_LF = auto()
    XMR_BID_TXN_SIGS_FL = auto()
    XMR_BID_LOCK_SPEND_TX_LF = auto()
    XMR_BID_LOCK_RELEASE_LF = auto()
    OFFER_REVOKE = auto()


class AddressTypes(IntEnum):
    OFFER = auto()
    BID = auto()
    RECV_OFFER = auto()
    SEND_OFFER = auto()


class SwapTypes(IntEnum):
    SELLER_FIRST = auto()
    BUYER_FIRST = auto()
    SELLER_FIRST_2MSG = auto()
    BUYER_FIRST_2MSG = auto()
    XMR_SWAP = auto()


class OfferStates(IntEnum):
    OFFER_SENT = auto()
    OFFER_RECEIVED = auto()
    OFFER_ABANDONED = auto()


class BidStates(IntEnum):
    BID_SENT = auto()
    BID_RECEIVING = auto()          # Partially received
    BID_RECEIVED = auto()
    BID_RECEIVING_ACC = auto()      # Partially received accept message
    BID_ACCEPTED = auto()           # BidAcceptMessage received/sent
    SWAP_INITIATED = auto()         # Initiate txn validated
    SWAP_PARTICIPATING = auto()     # Participate txn validated
    SWAP_COMPLETED = auto()         # All swap txns spent
    XMR_SWAP_SCRIPT_COIN_LOCKED = auto()
    XMR_SWAP_HAVE_SCRIPT_COIN_SPEND_TX = auto()
    XMR_SWAP_NOSCRIPT_COIN_LOCKED = auto()
    XMR_SWAP_LOCK_RELEASED = auto()
    XMR_SWAP_SCRIPT_TX_REDEEMED = auto()
    XMR_SWAP_SCRIPT_TX_PREREFUND = auto()  # script txo moved into pre-refund tx
    XMR_SWAP_NOSCRIPT_TX_REDEEMED = auto()
    XMR_SWAP_NOSCRIPT_TX_RECOVERED = auto()
    XMR_SWAP_FAILED_REFUNDED = auto()
    XMR_SWAP_FAILED_SWIPED = auto()
    XMR_SWAP_FAILED = auto()
    SWAP_DELAYING = auto()
    SWAP_TIMEDOUT = auto()
    BID_ABANDONED = auto()          # Bid will no longer be processed
    BID_ERROR = auto()              # An error occurred
    BID_STALLED_FOR_TEST = auto()
    BID_REJECTED = auto()
    BID_STATE_UNKNOWN = auto()


class TxStates(IntEnum):
    TX_NONE = auto()
    TX_SENT = auto()
    TX_CONFIRMED = auto()
    TX_REDEEMED = auto()
    TX_REFUNDED = auto()


class TxTypes(IntEnum):
    ITX = auto()
    PTX = auto()
    ITX_REDEEM = auto()
    ITX_REFUND = auto()
    PTX_REDEEM = auto()
    PTX_REFUND = auto()

    XMR_SWAP_A_LOCK = auto()
    XMR_SWAP_A_LOCK_SPEND = auto()
    XMR_SWAP_A_LOCK_REFUND = auto()
    XMR_SWAP_A_LOCK_REFUND_SPEND = auto()
    XMR_SWAP_A_LOCK_REFUND_SWIPE = auto()
    XMR_SWAP_B_LOCK = auto()


class EventTypes(IntEnum):
    ACCEPT_BID = auto()
    ACCEPT_XMR_BID = auto()
    SIGN_XMR_SWAP_LOCK_TX_A = auto()
    SEND_XMR_SWAP_LOCK_TX_A = auto()
    SEND_XMR_SWAP_LOCK_TX_B = auto()
    SEND_XMR_LOCK_RELEASE = auto()
    REDEEM_XMR_SWAP_LOCK_TX_A = auto()  # Follower
    REDEEM_XMR_SWAP_LOCK_TX_B = auto()  # Leader
    RECOVER_XMR_SWAP_LOCK_TX_B = auto()


class EventLogTypes(IntEnum):
    FAILED_TX_B_LOCK_PUBLISH = auto()
    LOCK_TX_A_PUBLISHED = auto()
    LOCK_TX_B_PUBLISHED = auto()
    FAILED_TX_B_SPEND = auto()
    LOCK_TX_A_SEEN = auto()
    LOCK_TX_A_CONFIRMED = auto()
    LOCK_TX_B_SEEN = auto()
    LOCK_TX_B_CONFIRMED = auto()
    DEBUG_TWEAK_APPLIED = auto()
    FAILED_TX_B_REFUND = auto()
    LOCK_TX_B_INVALID = auto()
    LOCK_TX_A_REFUND_TX_PUBLISHED = auto()
    LOCK_TX_A_REFUND_SPEND_TX_PUBLISHED = auto()
    LOCK_TX_A_REFUND_SWIPE_TX_PUBLISHED = auto()
    LOCK_TX_B_REFUND_TX_PUBLISHED = auto()
    SYSTEM_WARNING = auto()
    LOCK_TX_A_SPEND_TX_PUBLISHED = auto()
    LOCK_TX_B_SPEND_TX_PUBLISHED = auto()


class XmrSplitMsgTypes(IntEnum):
    BID = auto()
    BID_ACCEPT = auto()


class DebugTypes(IntEnum):
    BID_STOP_AFTER_COIN_A_LOCK = auto()
    BID_DONT_SPEND_COIN_A_LOCK_REFUND = auto()
    CREATE_INVALID_COIN_B_LOCK = auto()
    BUYER_STOP_AFTER_ITX = auto()
    MAKE_INVALID_PTX = auto()


def strOfferState(state):
    if state == OfferStates.OFFER_SENT:
        return 'Sent'
    if state == OfferStates.OFFER_RECEIVED:
        return 'Received'
    if state == OfferStates.OFFER_ABANDONED:
        return 'Abandoned'
    return 'Unknown'


def strBidState(state):
    if state == BidStates.BID_SENT:
        return 'Sent'
    if state == BidStates.BID_RECEIVING:
        return 'Receiving'
    if state == BidStates.BID_RECEIVING_ACC:
        return 'Receiving accept'
    if state == BidStates.BID_RECEIVED:
        return 'Received'
    if state == BidStates.BID_ACCEPTED:
        return 'Accepted'
    if state == BidStates.SWAP_INITIATED:
        return 'Initiated'
    if state == BidStates.SWAP_PARTICIPATING:
        return 'Participating'
    if state == BidStates.SWAP_COMPLETED:
        return 'Completed'
    if state == BidStates.SWAP_TIMEDOUT:
        return 'Timed-out'
    if state == BidStates.BID_ABANDONED:
        return 'Abandoned'
    if state == BidStates.BID_STALLED_FOR_TEST:
        return 'Stalled (debug)'
    if state == BidStates.BID_ERROR:
        return 'Error'
    if state == BidStates.BID_REJECTED:
        return 'Rejected'
    if state == BidStates.XMR_SWAP_SCRIPT_COIN_LOCKED:
        return 'Script coin locked'
    if state == BidStates.XMR_SWAP_HAVE_SCRIPT_COIN_SPEND_TX:
        return 'Script coin spend tx valid'
    if state == BidStates.XMR_SWAP_NOSCRIPT_COIN_LOCKED:
        return 'Scriptless coin locked'
    if state == BidStates.XMR_SWAP_LOCK_RELEASED:
        return 'Script coin lock released'
    if state == BidStates.XMR_SWAP_SCRIPT_TX_REDEEMED:
        return 'Script tx redeemed'
    if state == BidStates.XMR_SWAP_NOSCRIPT_TX_REDEEMED:
        return 'Scriptless tx redeemed'
    if state == BidStates.XMR_SWAP_NOSCRIPT_TX_RECOVERED:
        return 'Scriptless tx recovered'
    if state == BidStates.XMR_SWAP_FAILED_REFUNDED:
        return 'Failed, refunded'
    if state == BidStates.XMR_SWAP_FAILED_SWIPED:
        return 'Failed, swiped'
    if state == BidStates.XMR_SWAP_FAILED:
        return 'Failed'
    if state == BidStates.SWAP_DELAYING:
        return 'Delaying'
    return 'Unknown'


def strTxState(state):
    if state == TxStates.TX_NONE:
        return 'None'
    if state == TxStates.TX_SENT:
        return 'Sent'
    if state == TxStates.TX_CONFIRMED:
        return 'Confirmed'
    if state == TxStates.TX_REDEEMED:
        return 'Redeemed'
    if state == TxStates.TX_REFUNDED:
        return 'Refunded'
    return 'Unknown'


def strTxType(tx_type):
    if tx_type == TxTypes.XMR_SWAP_A_LOCK:
        return 'Chain A Lock Tx'
    if tx_type == TxTypes.XMR_SWAP_A_LOCK_SPEND:
        return 'Chain A Lock Spend Tx'
    if tx_type == TxTypes.XMR_SWAP_A_LOCK_REFUND:
        return 'Chain A Lock Refund Tx'
    if tx_type == TxTypes.XMR_SWAP_A_LOCK_REFUND_SPEND:
        return 'Chain A Lock Refund Spend Tx'
    if tx_type == TxTypes.XMR_SWAP_A_LOCK_REFUND_SWIPE:
        return 'Chain A Lock Refund Swipe Tx'
    if tx_type == TxTypes.XMR_SWAP_B_LOCK:
        return 'Chain B Lock Tx'
    return 'Unknown'


def strAddressType(addr_type):
    if addr_type == AddressTypes.OFFER:
        return 'Offer'
    if addr_type == AddressTypes.BID:
        return 'Bid'
    if addr_type == AddressTypes.RECV_OFFER:
        return 'Offer recv'
    if addr_type == AddressTypes.SEND_OFFER:
        return 'Offer send'
    return 'Unknown'


def getLockName(lock_type):
    if lock_type == SEQUENCE_LOCK_BLOCKS:
        return 'Sequence lock, blocks'
    if lock_type == SEQUENCE_LOCK_TIME:
        return 'Sequence lock, time'
    if lock_type == ABS_LOCK_BLOCKS:
        return 'blocks'
    if lock_type == ABS_LOCK_TIME:
        return 'time'


def describeEventEntry(event_type, event_msg):
    if event_type == EventLogTypes.FAILED_TX_B_LOCK_PUBLISH:
        return 'Failed to publish lock tx B'
    if event_type == EventLogTypes.FAILED_TX_B_LOCK_PUBLISH:
        return 'Failed to publish lock tx B'
    if event_type == EventLogTypes.LOCK_TX_A_PUBLISHED:
        return 'Lock tx A published'
    if event_type == EventLogTypes.LOCK_TX_B_PUBLISHED:
        return 'Lock tx B published'
    if event_type == EventLogTypes.FAILED_TX_B_SPEND:
        return 'Failed to publish lock tx B spend: ' + event_msg
    if event_type == EventLogTypes.LOCK_TX_A_SEEN:
        return 'Lock tx A seen in chain'
    if event_type == EventLogTypes.LOCK_TX_A_CONFIRMED:
        return 'Lock tx A confirmed in chain'
    if event_type == EventLogTypes.LOCK_TX_B_SEEN:
        return 'Lock tx B seen in chain'
    if event_type == EventLogTypes.LOCK_TX_B_CONFIRMED:
        return 'Lock tx B confirmed in chain'
    if event_type == EventLogTypes.DEBUG_TWEAK_APPLIED:
        return 'Debug tweak applied ' + event_msg
    if event_type == EventLogTypes.FAILED_TX_B_REFUND:
        return 'Failed to publish lock tx B refund'
    if event_type == EventLogTypes.LOCK_TX_B_INVALID:
        return 'Detected invalid lock Tx B'
    if event_type == EventLogTypes.LOCK_TX_A_REFUND_TX_PUBLISHED:
        return 'Lock tx A refund tx published'
    if event_type == EventLogTypes.LOCK_TX_A_REFUND_SPEND_TX_PUBLISHED:
        return 'Lock tx A refund spend tx published'
    if event_type == EventLogTypes.LOCK_TX_A_REFUND_SWIPE_TX_PUBLISHED:
        return 'Lock tx A refund swipe tx published'
    if event_type == EventLogTypes.LOCK_TX_B_REFUND_TX_PUBLISHED:
        return 'Lock tx B refund tx published'
    if event_type == EventLogTypes.LOCK_TX_A_SPEND_TX_PUBLISHED:
        return 'Lock tx A spend tx published'
    if event_type == EventLogTypes.LOCK_TX_B_SPEND_TX_PUBLISHED:
        return 'Lock tx B spend tx published'
    if event_type == EventLogTypes.SYSTEM_WARNING:
        return 'Warning: ' + event_msg


def getVoutByAddress(txjs, p2sh):
    for o in txjs['vout']:
        try:
            if p2sh in o['scriptPubKey']['addresses']:
                return o['n']
        except Exception:
            pass
    raise ValueError('Address output not found in txn')


def getVoutByP2WSH(txjs, p2wsh_hex):
    for o in txjs['vout']:
        try:
            if p2wsh_hex == o['scriptPubKey']['hex']:
                return o['n']
        except Exception:
            pass
    raise ValueError('P2WSH output not found in txn')


def replaceAddrPrefix(addr, coin_type, chain_name, addr_type='pubkey_address'):
    return encodeAddress(bytes((chainparams[coin_type][chain_name][addr_type],)) + decodeAddress(addr)[1:])


def getOfferProofOfFundsHash(offer_msg, offer_addr):
    # TODO: Hash must not include proof_of_funds sig if it exists in offer_msg
    h = hashlib.sha256()
    h.update(offer_addr.encode('utf-8'))
    offer_bytes = offer_msg.SerializeToString()
    h.update(offer_bytes)
    return h.digest()


def getLastBidState(packed_states):
    num_states = len(packed_states) // 12
    if num_states < 2:
        return BidStates.BID_STATE_UNKNOWN
    return struct.unpack_from('<i', packed_states[(num_states - 2) * 12:])[0]
    try:
        num_states = len(packed_states) // 12
        if num_states < 2:
            return BidStates.BID_STATE_UNKNOWN
        return struct.unpack_from('<i', packed_states[(num_states - 2) * 12:])[0]
    except Exception:
        return BidStates.BID_STATE_UNKNOWN


def isActiveBidState(state):
    if state == BidStates.XMR_SWAP_HAVE_SCRIPT_COIN_SPEND_TX:
        return True
    if state == BidStates.XMR_SWAP_SCRIPT_COIN_LOCKED:
        return True
    if state == BidStates.XMR_SWAP_NOSCRIPT_COIN_LOCKED:
        return True
    if state == BidStates.XMR_SWAP_LOCK_RELEASED:
        return True
    if state == BidStates.XMR_SWAP_NOSCRIPT_TX_REDEEMED:
        return True
    if state == BidStates.XMR_SWAP_SCRIPT_TX_REDEEMED:
        return True
    if state == BidStates.XMR_SWAP_SCRIPT_TX_PREREFUND:
        return True
    return False