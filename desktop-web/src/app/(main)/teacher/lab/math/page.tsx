import WhiteboardCanvas from '@/components/lab/whiteboard-canvas'
import React from 'react'

const MathLabPage = () => {
  return (
    <div className="w-full h-full bg-gray-900">
        <WhiteboardCanvas>
            <div className="flex items-center justify-center h-screen">
                <h1 className="text-4xl font-bold text-white">Math Lab</h1>
            </div>
        </WhiteboardCanvas>
    </div>
  )
}

export default MathLabPage;