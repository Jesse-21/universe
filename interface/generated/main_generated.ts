// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';


export class Message {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):Message {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsMessage(bb:flatbuffers.ByteBuffer, obj?:Message):Message {
  return (obj || new Message()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsMessage(bb:flatbuffers.ByteBuffer, obj?:Message):Message {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new Message()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

id():string|null
id(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
id(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

sender():string|null
sender(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
sender(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

recipient():string|null
recipient(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
recipient(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

timestamp():bigint {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.readUint64(this.bb_pos + offset) : BigInt('0');
}

content():string|null
content(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
content(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

signature():string|null
signature(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
signature(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 14);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startMessage(builder:flatbuffers.Builder) {
  builder.startObject(6);
}

static addId(builder:flatbuffers.Builder, idOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, idOffset, 0);
}

static addSender(builder:flatbuffers.Builder, senderOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, senderOffset, 0);
}

static addRecipient(builder:flatbuffers.Builder, recipientOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, recipientOffset, 0);
}

static addTimestamp(builder:flatbuffers.Builder, timestamp:bigint) {
  builder.addFieldInt64(3, timestamp, BigInt('0'));
}

static addContent(builder:flatbuffers.Builder, contentOffset:flatbuffers.Offset) {
  builder.addFieldOffset(4, contentOffset, 0);
}

static addSignature(builder:flatbuffers.Builder, signatureOffset:flatbuffers.Offset) {
  builder.addFieldOffset(5, signatureOffset, 0);
}

static endMessage(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createMessage(builder:flatbuffers.Builder, idOffset:flatbuffers.Offset, senderOffset:flatbuffers.Offset, recipientOffset:flatbuffers.Offset, timestamp:bigint, contentOffset:flatbuffers.Offset, signatureOffset:flatbuffers.Offset):flatbuffers.Offset {
  Message.startMessage(builder);
  Message.addId(builder, idOffset);
  Message.addSender(builder, senderOffset);
  Message.addRecipient(builder, recipientOffset);
  Message.addTimestamp(builder, timestamp);
  Message.addContent(builder, contentOffset);
  Message.addSignature(builder, signatureOffset);
  return Message.endMessage(builder);
}
}

export class Channel {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):Channel {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsChannel(bb:flatbuffers.ByteBuffer, obj?:Channel):Channel {
  return (obj || new Channel()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsChannel(bb:flatbuffers.ByteBuffer, obj?:Channel):Channel {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new Channel()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

id():string|null
id(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
id(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

dimension():string|null
dimension(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
dimension(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

name():string|null
name(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
name(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

members(index: number):string
members(index: number,optionalEncoding:flatbuffers.Encoding):string|Uint8Array
members(index: number,optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.__string(this.bb!.__vector(this.bb_pos + offset) + index * 4, optionalEncoding) : null;
}

membersLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startChannel(builder:flatbuffers.Builder) {
  builder.startObject(4);
}

static addId(builder:flatbuffers.Builder, idOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, idOffset, 0);
}

static addDimension(builder:flatbuffers.Builder, dimensionOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, dimensionOffset, 0);
}

static addName(builder:flatbuffers.Builder, nameOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, nameOffset, 0);
}

static addMembers(builder:flatbuffers.Builder, membersOffset:flatbuffers.Offset) {
  builder.addFieldOffset(3, membersOffset, 0);
}

static createMembersVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startMembersVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endChannel(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createChannel(builder:flatbuffers.Builder, idOffset:flatbuffers.Offset, dimensionOffset:flatbuffers.Offset, nameOffset:flatbuffers.Offset, membersOffset:flatbuffers.Offset):flatbuffers.Offset {
  Channel.startChannel(builder);
  Channel.addId(builder, idOffset);
  Channel.addDimension(builder, dimensionOffset);
  Channel.addName(builder, nameOffset);
  Channel.addMembers(builder, membersOffset);
  return Channel.endChannel(builder);
}
}

export class Subscription {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):Subscription {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsSubscription(bb:flatbuffers.ByteBuffer, obj?:Subscription):Subscription {
  return (obj || new Subscription()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsSubscription(bb:flatbuffers.ByteBuffer, obj?:Subscription):Subscription {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new Subscription()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

id():string|null
id(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
id(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

user():string|null
user(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
user(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

dimension():string|null
dimension(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
dimension(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

channel():string|null
channel(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
channel(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startSubscription(builder:flatbuffers.Builder) {
  builder.startObject(4);
}

static addId(builder:flatbuffers.Builder, idOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, idOffset, 0);
}

static addUser(builder:flatbuffers.Builder, userOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, userOffset, 0);
}

static addDimension(builder:flatbuffers.Builder, dimensionOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, dimensionOffset, 0);
}

static addChannel(builder:flatbuffers.Builder, channelOffset:flatbuffers.Offset) {
  builder.addFieldOffset(3, channelOffset, 0);
}

static endSubscription(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createSubscription(builder:flatbuffers.Builder, idOffset:flatbuffers.Offset, userOffset:flatbuffers.Offset, dimensionOffset:flatbuffers.Offset, channelOffset:flatbuffers.Offset):flatbuffers.Offset {
  Subscription.startSubscription(builder);
  Subscription.addId(builder, idOffset);
  Subscription.addUser(builder, userOffset);
  Subscription.addDimension(builder, dimensionOffset);
  Subscription.addChannel(builder, channelOffset);
  return Subscription.endSubscription(builder);
}
}

export class SendMessageRequest {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):SendMessageRequest {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsSendMessageRequest(bb:flatbuffers.ByteBuffer, obj?:SendMessageRequest):SendMessageRequest {
  return (obj || new SendMessageRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsSendMessageRequest(bb:flatbuffers.ByteBuffer, obj?:SendMessageRequest):SendMessageRequest {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new SendMessageRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

recipient():string|null
recipient(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
recipient(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

dimension():string|null
dimension(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
dimension(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

channel():string|null
channel(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
channel(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

content():string|null
content(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
content(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

sender():string|null
sender(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
sender(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

signedMessage():string|null
signedMessage(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
signedMessage(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 14);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startSendMessageRequest(builder:flatbuffers.Builder) {
  builder.startObject(6);
}

static addRecipient(builder:flatbuffers.Builder, recipientOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, recipientOffset, 0);
}

static addDimension(builder:flatbuffers.Builder, dimensionOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, dimensionOffset, 0);
}

static addChannel(builder:flatbuffers.Builder, channelOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, channelOffset, 0);
}

static addContent(builder:flatbuffers.Builder, contentOffset:flatbuffers.Offset) {
  builder.addFieldOffset(3, contentOffset, 0);
}

static addSender(builder:flatbuffers.Builder, senderOffset:flatbuffers.Offset) {
  builder.addFieldOffset(4, senderOffset, 0);
}

static addSignedMessage(builder:flatbuffers.Builder, signedMessageOffset:flatbuffers.Offset) {
  builder.addFieldOffset(5, signedMessageOffset, 0);
}

static endSendMessageRequest(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createSendMessageRequest(builder:flatbuffers.Builder, recipientOffset:flatbuffers.Offset, dimensionOffset:flatbuffers.Offset, channelOffset:flatbuffers.Offset, contentOffset:flatbuffers.Offset, senderOffset:flatbuffers.Offset, signedMessageOffset:flatbuffers.Offset):flatbuffers.Offset {
  SendMessageRequest.startSendMessageRequest(builder);
  SendMessageRequest.addRecipient(builder, recipientOffset);
  SendMessageRequest.addDimension(builder, dimensionOffset);
  SendMessageRequest.addChannel(builder, channelOffset);
  SendMessageRequest.addContent(builder, contentOffset);
  SendMessageRequest.addSender(builder, senderOffset);
  SendMessageRequest.addSignedMessage(builder, signedMessageOffset);
  return SendMessageRequest.endSendMessageRequest(builder);
}
}

export class SendMessageResponse {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):SendMessageResponse {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsSendMessageResponse(bb:flatbuffers.ByteBuffer, obj?:SendMessageResponse):SendMessageResponse {
  return (obj || new SendMessageResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsSendMessageResponse(bb:flatbuffers.ByteBuffer, obj?:SendMessageResponse):SendMessageResponse {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new SendMessageResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

message(obj?:Message):Message|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? (obj || new Message()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

static startSendMessageResponse(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addMessage(builder:flatbuffers.Builder, messageOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, messageOffset, 0);
}

static endSendMessageResponse(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createSendMessageResponse(builder:flatbuffers.Builder, messageOffset:flatbuffers.Offset):flatbuffers.Offset {
  SendMessageResponse.startSendMessageResponse(builder);
  SendMessageResponse.addMessage(builder, messageOffset);
  return SendMessageResponse.endSendMessageResponse(builder);
}
}

export class SubscribeRequest {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):SubscribeRequest {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsSubscribeRequest(bb:flatbuffers.ByteBuffer, obj?:SubscribeRequest):SubscribeRequest {
  return (obj || new SubscribeRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsSubscribeRequest(bb:flatbuffers.ByteBuffer, obj?:SubscribeRequest):SubscribeRequest {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new SubscribeRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

user():string|null
user(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
user(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

dimension():string|null
dimension(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
dimension(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

channel():string|null
channel(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
channel(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startSubscribeRequest(builder:flatbuffers.Builder) {
  builder.startObject(3);
}

static addUser(builder:flatbuffers.Builder, userOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, userOffset, 0);
}

static addDimension(builder:flatbuffers.Builder, dimensionOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, dimensionOffset, 0);
}

static addChannel(builder:flatbuffers.Builder, channelOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, channelOffset, 0);
}

static endSubscribeRequest(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createSubscribeRequest(builder:flatbuffers.Builder, userOffset:flatbuffers.Offset, dimensionOffset:flatbuffers.Offset, channelOffset:flatbuffers.Offset):flatbuffers.Offset {
  SubscribeRequest.startSubscribeRequest(builder);
  SubscribeRequest.addUser(builder, userOffset);
  SubscribeRequest.addDimension(builder, dimensionOffset);
  SubscribeRequest.addChannel(builder, channelOffset);
  return SubscribeRequest.endSubscribeRequest(builder);
}
}

export class SubscribeResponse {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):SubscribeResponse {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsSubscribeResponse(bb:flatbuffers.ByteBuffer, obj?:SubscribeResponse):SubscribeResponse {
  return (obj || new SubscribeResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsSubscribeResponse(bb:flatbuffers.ByteBuffer, obj?:SubscribeResponse):SubscribeResponse {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new SubscribeResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

subscription(obj?:Subscription):Subscription|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? (obj || new Subscription()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

static startSubscribeResponse(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addSubscription(builder:flatbuffers.Builder, subscriptionOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, subscriptionOffset, 0);
}

static endSubscribeResponse(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createSubscribeResponse(builder:flatbuffers.Builder, subscriptionOffset:flatbuffers.Offset):flatbuffers.Offset {
  SubscribeResponse.startSubscribeResponse(builder);
  SubscribeResponse.addSubscription(builder, subscriptionOffset);
  return SubscribeResponse.endSubscribeResponse(builder);
}
}

export class MessagesRequest {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):MessagesRequest {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsMessagesRequest(bb:flatbuffers.ByteBuffer, obj?:MessagesRequest):MessagesRequest {
  return (obj || new MessagesRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsMessagesRequest(bb:flatbuffers.ByteBuffer, obj?:MessagesRequest):MessagesRequest {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new MessagesRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

dimension():string|null
dimension(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
dimension(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

channel():string|null
channel(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
channel(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startMessagesRequest(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addDimension(builder:flatbuffers.Builder, dimensionOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, dimensionOffset, 0);
}

static addChannel(builder:flatbuffers.Builder, channelOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, channelOffset, 0);
}

static endMessagesRequest(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createMessagesRequest(builder:flatbuffers.Builder, dimensionOffset:flatbuffers.Offset, channelOffset:flatbuffers.Offset):flatbuffers.Offset {
  MessagesRequest.startMessagesRequest(builder);
  MessagesRequest.addDimension(builder, dimensionOffset);
  MessagesRequest.addChannel(builder, channelOffset);
  return MessagesRequest.endMessagesRequest(builder);
}
}

export class MessagesResponse {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):MessagesResponse {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsMessagesResponse(bb:flatbuffers.ByteBuffer, obj?:MessagesResponse):MessagesResponse {
  return (obj || new MessagesResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsMessagesResponse(bb:flatbuffers.ByteBuffer, obj?:MessagesResponse):MessagesResponse {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new MessagesResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

messages(index: number, obj?:Message):Message|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? (obj || new Message()).__init(this.bb!.__indirect(this.bb!.__vector(this.bb_pos + offset) + index * 4), this.bb!) : null;
}

messagesLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startMessagesResponse(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addMessages(builder:flatbuffers.Builder, messagesOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, messagesOffset, 0);
}

static createMessagesVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startMessagesVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endMessagesResponse(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createMessagesResponse(builder:flatbuffers.Builder, messagesOffset:flatbuffers.Offset):flatbuffers.Offset {
  MessagesResponse.startMessagesResponse(builder);
  MessagesResponse.addMessages(builder, messagesOffset);
  return MessagesResponse.endMessagesResponse(builder);
}
}

export class ValidateMessageRequest {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):ValidateMessageRequest {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsValidateMessageRequest(bb:flatbuffers.ByteBuffer, obj?:ValidateMessageRequest):ValidateMessageRequest {
  return (obj || new ValidateMessageRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsValidateMessageRequest(bb:flatbuffers.ByteBuffer, obj?:ValidateMessageRequest):ValidateMessageRequest {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new ValidateMessageRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

message(obj?:Message):Message|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? (obj || new Message()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

sender():string|null
sender(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
sender(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startValidateMessageRequest(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addMessage(builder:flatbuffers.Builder, messageOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, messageOffset, 0);
}

static addSender(builder:flatbuffers.Builder, senderOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, senderOffset, 0);
}

static endValidateMessageRequest(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createValidateMessageRequest(builder:flatbuffers.Builder, messageOffset:flatbuffers.Offset, senderOffset:flatbuffers.Offset):flatbuffers.Offset {
  ValidateMessageRequest.startValidateMessageRequest(builder);
  ValidateMessageRequest.addMessage(builder, messageOffset);
  ValidateMessageRequest.addSender(builder, senderOffset);
  return ValidateMessageRequest.endValidateMessageRequest(builder);
}
}

export class ValidateMessageResponse {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):ValidateMessageResponse {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsValidateMessageResponse(bb:flatbuffers.ByteBuffer, obj?:ValidateMessageResponse):ValidateMessageResponse {
  return (obj || new ValidateMessageResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsValidateMessageResponse(bb:flatbuffers.ByteBuffer, obj?:ValidateMessageResponse):ValidateMessageResponse {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new ValidateMessageResponse()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

valid():boolean {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? !!this.bb!.readInt8(this.bb_pos + offset) : false;
}

static startValidateMessageResponse(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addValid(builder:flatbuffers.Builder, valid:boolean) {
  builder.addFieldInt8(0, +valid, +false);
}

static endValidateMessageResponse(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createValidateMessageResponse(builder:flatbuffers.Builder, valid:boolean):flatbuffers.Offset {
  ValidateMessageResponse.startValidateMessageResponse(builder);
  ValidateMessageResponse.addValid(builder, valid);
  return ValidateMessageResponse.endValidateMessageResponse(builder);
}
}

